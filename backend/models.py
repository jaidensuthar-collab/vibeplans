import uuid
from datetime import datetime, timezone

from sqlalchemy import String, Integer, ForeignKey, DateTime, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


def _now() -> datetime:
    return datetime.now(timezone.utc)


class Group(Base):
    __tablename__ = "groups"

    code: Mapped[str] = mapped_column(String, primary_key=True)
    id: Mapped[str] = mapped_column(String, default=lambda: str(uuid.uuid4()))
    prompt: Mapped[str] = mapped_column(String)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    constraints: Mapped[list["Constraint"]] = relationship(
        "Constraint", back_populates="group", cascade="all, delete-orphan"
    )
    votes: Mapped[list["Vote"]] = relationship(
        "Vote", back_populates="group", cascade="all, delete-orphan"
    )


class Constraint(Base):
    __tablename__ = "constraints"
    __table_args__ = (UniqueConstraint("group_code", "member_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    group_code: Mapped[str] = mapped_column(ForeignKey("groups.code"))
    member_id: Mapped[str] = mapped_column(String)
    name: Mapped[str] = mapped_column(String, default="")
    max_budget: Mapped[int | None] = mapped_column(Integer, nullable=True)
    max_distance_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)

    group: Mapped["Group"] = relationship("Group", back_populates="constraints")


class Vote(Base):
    __tablename__ = "votes"
    __table_args__ = (UniqueConstraint("group_code", "member_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    group_code: Mapped[str] = mapped_column(ForeignKey("groups.code"))
    member_id: Mapped[str] = mapped_column(String)
    activity_id: Mapped[str] = mapped_column(String)

    group: Mapped["Group"] = relationship("Group", back_populates="votes")
