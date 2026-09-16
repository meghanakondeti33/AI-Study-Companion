import pytest
from sqlalchemy.orm import Session
from app.modules.users.models import User
from app.core.security import verify_password


# Helper fixture for creating a test user and returning auth headers
def create_authenticated_user(client, email: str, name: str, password: str = "SecurePass123!"):
    reg_res = client.post(
        "/api/v1/auth/register",
        json={"email": email, "name": name, "password": password},
    )
    assert reg_res.status_code == 201, reg_res.text
    user_data = reg_res.json()

    login_res = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
    )
    assert login_res.status_code == 200, login_res.text
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    return user_data, headers


# ==============================================================================
# AUTH TESTS (1 - 6)
# ==============================================================================

def test_1_successful_registration(client):
    res = client.post(
        "/api/v1/auth/register",
        json={"email": "alice@example.com", "name": "Alice Learner", "password": "Password123!"},
    )
    assert res.status_code == 201
    data = res.json()
    assert data["email"] == "alice@example.com"
    assert data["name"] == "Alice Learner"
    assert "id" in data
    assert "password" not in data
    assert "password_hash" not in data


def test_2_duplicate_email_registration(client):
    payload = {"email": "duplicate@example.com", "name": "User One", "password": "Password123!"}
    res1 = client.post("/api/v1/auth/register", json=payload)
    assert res1.status_code == 201

    res2 = client.post("/api/v1/auth/register", json=payload)
    assert res2.status_code == 400
    assert "already registered" in res2.json()["detail"].lower()


def test_3_successful_login(client):
    email = "login_success@example.com"
    password = "CorrectPassword123!"
    client.post("/api/v1/auth/register", json={"email": email, "name": "Tester", "password": password})

    res = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


def test_4_invalid_password(client):
    email = "wrong_pass@example.com"
    client.post("/api/v1/auth/register", json={"email": email, "name": "Tester", "password": "ValidPassword123!"})

    res = client.post("/api/v1/auth/login", json={"email": email, "password": "WrongPassword999!"})
    assert res.status_code == 401
    assert "invalid" in res.json()["detail"].lower()


def test_5_auth_me_with_valid_authentication(client):
    user_data, headers = create_authenticated_user(client, "me_valid@example.com", "Me Valid")
    res = client.get("/api/v1/auth/me", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["id"] == user_data["id"]
    assert data["email"] == "me_valid@example.com"
    assert data["name"] == "Me Valid"


def test_6_auth_me_without_authentication(client):
    res = client.get("/api/v1/auth/me")
    assert res.status_code == 401


# ==============================================================================
# SPACES TESTS (7 - 11)
# ==============================================================================

def test_7_authenticated_user_can_create_space(client):
    user, headers = create_authenticated_user(client, "space_owner@example.com", "Space Owner")
    res = client.post(
        "/api/v1/spaces",
        headers=headers,
        json={"name": "Computer Science", "description": "Core CS curriculum"},
    )
    assert res.status_code == 201
    data = res.json()
    assert data["name"] == "Computer Science"
    assert data["description"] == "Core CS curriculum"
    assert data["user_id"] == user["id"]
    assert "id" in data


def test_8_user_can_list_their_spaces(client):
    user, headers = create_authenticated_user(client, "space_lister@example.com", "Space Lister")
    client.post("/api/v1/spaces", headers=headers, json={"name": "Space 1"})
    client.post("/api/v1/spaces", headers=headers, json={"name": "Space 2"})

    res = client.get("/api/v1/spaces", headers=headers)
    assert res.status_code == 200
    spaces = res.json()
    assert len(spaces) == 2
    names = [s["name"] for s in spaces]
    assert "Space 1" in names and "Space 2" in names


def test_9_user_can_retrieve_their_space(client):
    user, headers = create_authenticated_user(client, "space_getter@example.com", "Space Getter")
    created = client.post("/api/v1/spaces", headers=headers, json={"name": "Algorithms"}).json()

    res = client.get(f"/api/v1/spaces/{created['id']}", headers=headers)
    assert res.status_code == 200
    assert res.json()["id"] == created["id"]
    assert res.json()["name"] == "Algorithms"


def test_10_user_can_update_their_space(client):
    user, headers = create_authenticated_user(client, "space_updater@example.com", "Space Updater")
    created = client.post("/api/v1/spaces", headers=headers, json={"name": "Old Name", "description": "Old Desc"}).json()

    res = client.patch(
        f"/api/v1/spaces/{created['id']}",
        headers=headers,
        json={"name": "New Name", "description": "New Desc"},
    )
    assert res.status_code == 200
    updated = res.json()
    assert updated["name"] == "New Name"
    assert updated["description"] == "New Desc"


def test_11_user_can_delete_their_space(client):
    user, headers = create_authenticated_user(client, "space_deleter@example.com", "Space Deleter")
    created = client.post("/api/v1/spaces", headers=headers, json={"name": "To Delete"}).json()

    res = client.delete(f"/api/v1/spaces/{created['id']}", headers=headers)
    assert res.status_code == 204

    get_res = client.get(f"/api/v1/spaces/{created['id']}", headers=headers)
    assert get_res.status_code == 404


# ==============================================================================
# PROJECTS TESTS (12 - 16)
# ==============================================================================

def test_12_authenticated_user_can_create_project(client):
    user, headers = create_authenticated_user(client, "proj_creator@example.com", "Proj Creator")
    space = client.post("/api/v1/spaces", headers=headers, json={"name": "Math Space"}).json()

    res = client.post(
        "/api/v1/projects",
        headers=headers,
        json={
            "space_id": space["id"],
            "name": "Linear Algebra Mastery",
            "description": "Eigenvalues and matrix decomposition",
            "learning_goal": "Pass advanced exam with 90%",
        },
    )
    assert res.status_code == 201
    project = res.json()
    assert project["name"] == "Linear Algebra Mastery"
    assert project["space_id"] == space["id"]
    assert project["user_id"] == user["id"]
    assert project["learning_goal"] == "Pass advanced exam with 90%"


def test_13_user_can_list_their_projects(client):
    user, headers = create_authenticated_user(client, "proj_lister@example.com", "Proj Lister")
    s1 = client.post("/api/v1/spaces", headers=headers, json={"name": "Space 1"}).json()
    s2 = client.post("/api/v1/spaces", headers=headers, json={"name": "Space 2"}).json()

    client.post("/api/v1/projects", headers=headers, json={"space_id": s1["id"], "name": "Project 1A"})
    client.post("/api/v1/projects", headers=headers, json={"space_id": s1["id"], "name": "Project 1B"})
    client.post("/api/v1/projects", headers=headers, json={"space_id": s2["id"], "name": "Project 2A"})

    # All projects
    all_res = client.get("/api/v1/projects", headers=headers)
    assert all_res.status_code == 200
    assert len(all_res.json()) == 3

    # Filtered by space
    filtered_res = client.get(f"/api/v1/projects?space_id={s1['id']}", headers=headers)
    assert filtered_res.status_code == 200
    assert len(filtered_res.json()) == 2


def test_14_user_can_retrieve_their_project(client):
    user, headers = create_authenticated_user(client, "proj_getter@example.com", "Proj Getter")
    space = client.post("/api/v1/spaces", headers=headers, json={"name": "Physics"}).json()
    created = client.post(
        "/api/v1/projects",
        headers=headers,
        json={"space_id": space["id"], "name": "Quantum Mechanics"},
    ).json()

    res = client.get(f"/api/v1/projects/{created['id']}", headers=headers)
    assert res.status_code == 200
    assert res.json()["name"] == "Quantum Mechanics"


def test_15_user_can_update_their_project(client):
    user, headers = create_authenticated_user(client, "proj_updater@example.com", "Proj Updater")
    space = client.post("/api/v1/spaces", headers=headers, json={"name": "Biology"}).json()
    created = client.post(
        "/api/v1/projects",
        headers=headers,
        json={"space_id": space["id"], "name": "Genetics"},
    ).json()

    res = client.patch(
        f"/api/v1/projects/{created['id']}",
        headers=headers,
        json={"name": "Molecular Genetics", "learning_goal": "Understand CRISPR"},
    )
    assert res.status_code == 200
    updated = res.json()
    assert updated["name"] == "Molecular Genetics"
    assert updated["learning_goal"] == "Understand CRISPR"


def test_16_user_can_delete_their_project(client):
    user, headers = create_authenticated_user(client, "proj_deleter@example.com", "Proj Deleter")
    space = client.post("/api/v1/spaces", headers=headers, json={"name": "History"}).json()
    created = client.post(
        "/api/v1/projects",
        headers=headers,
        json={"space_id": space["id"], "name": "Ancient Rome"},
    ).json()

    res = client.delete(f"/api/v1/projects/{created['id']}", headers=headers)
    assert res.status_code == 204

    get_res = client.get(f"/api/v1/projects/{created['id']}", headers=headers)
    assert get_res.status_code == 404


# ==============================================================================
# USER ISOLATION TESTS (17 - 23)
# ==============================================================================

def test_17_user_a_cannot_access_user_b_space(client):
    user_a, headers_a = create_authenticated_user(client, "user_a17@example.com", "User A")
    user_b, headers_b = create_authenticated_user(client, "user_b17@example.com", "User B")

    space_b = client.post("/api/v1/spaces", headers=headers_b, json={"name": "User B Secret Space"}).json()

    # User A tries to GET User B's space
    res = client.get(f"/api/v1/spaces/{space_b['id']}", headers=headers_a)
    assert res.status_code == 404


def test_18_user_a_cannot_update_user_b_space(client):
    user_a, headers_a = create_authenticated_user(client, "user_a18@example.com", "User A")
    user_b, headers_b = create_authenticated_user(client, "user_b18@example.com", "User B")

    space_b = client.post("/api/v1/spaces", headers=headers_b, json={"name": "User B Private Space"}).json()

    # User A tries to PATCH User B's space
    res = client.patch(
        f"/api/v1/spaces/{space_b['id']}",
        headers=headers_a,
        json={"name": "Tampered Name"},
    )
    assert res.status_code == 404


def test_19_user_a_cannot_delete_user_b_space(client):
    user_a, headers_a = create_authenticated_user(client, "user_a19@example.com", "User A")
    user_b, headers_b = create_authenticated_user(client, "user_b19@example.com", "User B")

    space_b = client.post("/api/v1/spaces", headers=headers_b, json={"name": "User B Safe Space"}).json()

    # User A tries to DELETE User B's space
    res = client.delete(f"/api/v1/spaces/{space_b['id']}", headers=headers_a)
    assert res.status_code == 404

    # Space B must still exist for User B
    check_b = client.get(f"/api/v1/spaces/{space_b['id']}", headers=headers_b)
    assert check_b.status_code == 200


def test_20_user_a_cannot_access_user_b_project(client):
    user_a, headers_a = create_authenticated_user(client, "user_a20@example.com", "User A")
    user_b, headers_b = create_authenticated_user(client, "user_b20@example.com", "User B")

    space_b = client.post("/api/v1/spaces", headers=headers_b, json={"name": "Space B"}).json()
    proj_b = client.post(
        "/api/v1/projects",
        headers=headers_b,
        json={"space_id": space_b["id"], "name": "Project B"},
    ).json()

    # User A tries to GET User B's project
    res = client.get(f"/api/v1/projects/{proj_b['id']}", headers=headers_a)
    assert res.status_code == 404


def test_21_user_a_cannot_update_user_b_project(client):
    user_a, headers_a = create_authenticated_user(client, "user_a21@example.com", "User A")
    user_b, headers_b = create_authenticated_user(client, "user_b21@example.com", "User B")

    space_b = client.post("/api/v1/spaces", headers=headers_b, json={"name": "Space B"}).json()
    proj_b = client.post(
        "/api/v1/projects",
        headers=headers_b,
        json={"space_id": space_b["id"], "name": "Project B"},
    ).json()

    # User A tries to PATCH User B's project
    res = client.patch(
        f"/api/v1/projects/{proj_b['id']}",
        headers=headers_a,
        json={"name": "Malicious Hijack"},
    )
    assert res.status_code == 404


def test_22_user_a_cannot_delete_user_b_project(client):
    user_a, headers_a = create_authenticated_user(client, "user_a22@example.com", "User A")
    user_b, headers_b = create_authenticated_user(client, "user_b22@example.com", "User B")

    space_b = client.post("/api/v1/spaces", headers=headers_b, json={"name": "Space B"}).json()
    proj_b = client.post(
        "/api/v1/projects",
        headers=headers_b,
        json={"space_id": space_b["id"], "name": "Project B"},
    ).json()

    # User A tries to DELETE User B's project
    res = client.delete(f"/api/v1/projects/{proj_b['id']}", headers=headers_a)
    assert res.status_code == 404

    # Project B must still exist for User B
    check_b = client.get(f"/api/v1/projects/{proj_b['id']}", headers=headers_b)
    assert check_b.status_code == 200


def test_23_user_a_cannot_create_project_in_user_b_space(client):
    user_a, headers_a = create_authenticated_user(client, "user_a23@example.com", "User A")
    user_b, headers_b = create_authenticated_user(client, "user_b23@example.com", "User B")

    space_b = client.post("/api/v1/spaces", headers=headers_b, json={"name": "Space B"}).json()

    # User A tries to create a project targeting Space B
    res = client.post(
        "/api/v1/projects",
        headers=headers_a,
        json={"space_id": space_b["id"], "name": "Intruder Project"},
    )
    assert res.status_code == 404


# ==============================================================================
# SECURITY & AUTH ENFORCEMENT TESTS (24 - 25)
# ==============================================================================

def test_24_passwords_never_stored_as_plaintext(client, db_session: Session):
    plain = "SuperSecretPlainText123!"
    res = client.post(
        "/api/v1/auth/register",
        json={"email": "plain_check@example.com", "name": "Security Check", "password": plain},
    )
    assert res.status_code == 201
    user_id = res.json()["id"]

    db_user = db_session.query(User).filter(User.id == user_id).first()
    assert db_user is not None
    assert db_user.password_hash != plain
    assert not db_user.password_hash.startswith("SuperSecret")
    assert verify_password(plain, db_user.password_hash) is True


def test_25_protected_endpoints_reject_unauthenticated_requests(client):
    # Missing tokens
    assert client.get("/api/v1/auth/me").status_code == 401
    assert client.get("/api/v1/spaces").status_code == 401
    assert client.post("/api/v1/spaces", json={"name": "X"}).status_code == 401
    assert client.get("/api/v1/projects").status_code == 401
    assert client.post("/api/v1/projects", json={"space_id": "1", "name": "X"}).status_code == 401

    # Malformed / forged tokens
    fake_header = {"Authorization": "Bearer forged.token.signature"}
    assert client.get("/api/v1/auth/me", headers=fake_header).status_code == 401
    assert client.get("/api/v1/spaces", headers=fake_header).status_code == 401
    assert client.get("/api/v1/projects", headers=fake_header).status_code == 401
