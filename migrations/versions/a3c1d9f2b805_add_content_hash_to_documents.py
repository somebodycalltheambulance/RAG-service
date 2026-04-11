"""add content_hash to documents

Revision ID: a3c1d9f2b805
Revises: f6de80942724
Create Date: 2026-04-11 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a3c1d9f2b805'
down_revision: Union[str, Sequence[str], None] = 'f6de80942724'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'documents',
        sa.Column('content_hash', sa.String(length=64), nullable=True),
    )
    # Заполняем хэши для существующих строк
    op.execute(
        "UPDATE documents SET content_hash = encode(sha256(content::bytea), 'hex') WHERE content_hash IS NULL"
    )
    # Удаляем дубли — оставляем документ с наименьшим created_at для каждого хэша
    # Сначала удаляем чанки дублей, потом сами документы
    op.execute(
        """
        DELETE FROM chunks
        WHERE document_id IN (
            SELECT id FROM (
                SELECT id,
                       ROW_NUMBER() OVER (PARTITION BY content_hash ORDER BY created_at) AS rn
                FROM documents
            ) ranked
            WHERE rn > 1
        )
        """
    )
    op.execute(
        """
        DELETE FROM documents
        WHERE id IN (
            SELECT id FROM (
                SELECT id,
                       ROW_NUMBER() OVER (PARTITION BY content_hash ORDER BY created_at) AS rn
                FROM documents
            ) ranked
            WHERE rn > 1
        )
        """
    )
    op.alter_column('documents', 'content_hash', nullable=False)
    op.create_index('ix_documents_content_hash', 'documents', ['content_hash'], unique=True)


def downgrade() -> None:
    op.drop_index('ix_documents_content_hash', table_name='documents')
    op.drop_column('documents', 'content_hash')
