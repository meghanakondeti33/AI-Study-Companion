from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.security import get_password_hash, verify_password, create_access_token
from app.modules.users.models import User
from app.modules.users.schemas import UserCreate, UserLogin, UserRead, Token
from app.modules.auth.dependencies import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post(
    "/register",
    response_model=UserRead,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user",
)
def register_user(payload: UserCreate, db: Session = Depends(get_db)):
    """Register a new user with email, name, and password."""
    normalized_email = payload.email.lower().strip()
    existing_user = db.query(User).filter(User.email == normalized_email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    hashed_password = get_password_hash(payload.password)
    user = User(
        email=normalized_email,
        name=payload.name.strip(),
        password_hash=hashed_password,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post(
    "/login",
    response_model=Token,
    status_code=status.HTTP_200_OK,
    summary="Authenticate and receive JWT token",
)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    """Authenticate with email and password to receive a bearer access token."""
    normalized_email = payload.email.lower().strip()
    user = db.query(User).filter(User.email == normalized_email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is inactive",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(subject=user.id)
    return Token(access_token=access_token, token_type="bearer")


@router.get(
    "/me",
    response_model=UserRead,
    status_code=status.HTTP_200_OK,
    summary="Get current authenticated user",
)
def get_me(current_user: User = Depends(get_current_user)):
    """Retrieve profile of the currently authenticated user."""
    return current_user
