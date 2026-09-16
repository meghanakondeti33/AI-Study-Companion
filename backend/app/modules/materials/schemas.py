from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.modules.materials.models import MaterialStatus


class MaterialRead(BaseModel):
    id: str
    project_id: str
    filename: str
    original_filename: str
    file_type: str
    file_size: int
    status: MaterialStatus
    error_message: str | None = None
    page_count: int | None = None
    created_at: datetime
    updated_at: datetime
    processed_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class MaterialDetailRead(MaterialRead):
    pass


class MaterialPageRead(BaseModel):
    id: str
    material_id: str
    page_number: int
    text: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
