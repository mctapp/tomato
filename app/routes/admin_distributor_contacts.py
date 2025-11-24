# app/routes/admin_distributor_contacts.py
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List

from app.db import get_session  # get_db → get_session으로 변경
from app.models.distributor_contacts import DistributorContact

router = APIRouter(
    prefix="/admin/distributor-contacts",
    tags=["DistributorContacts"]
)

@router.get("/", response_model=List[DistributorContact])
def list_contacts(
    db: Session = Depends(get_session)  # get_db → get_session
):
    """배급사 담당자 목록 조회"""
    contacts = db.exec(select(DistributorContact)).all()
    return contacts

@router.post("/", response_model=DistributorContact, status_code=201)
def create_contact(
    contact: DistributorContact,
    db: Session = Depends(get_session)  # get_db → get_session
):
    """배급사 담당자 생성"""
    db.add(contact)
    db.commit()
    db.refresh(contact)
    return contact

@router.get("/{contact_id}", response_model=DistributorContact)
def get_contact(
    contact_id: int,
    db: Session = Depends(get_session)  # get_db → get_session
):
    """배급사 담당자 상세 조회"""
    contact = db.get(DistributorContact, contact_id)
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    return contact

@router.put("/{contact_id}", response_model=DistributorContact)
def update_contact(
    contact_id: int,
    updated: DistributorContact,
    db: Session = Depends(get_session)  # get_db → get_session
):
    """배급사 담당자 수정"""
    contact = db.get(DistributorContact, contact_id)
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    for key, value in updated.dict(exclude_unset=True).items():
        setattr(contact, key, value)
    
    db.add(contact)
    db.commit()
    db.refresh(contact)
    return contact

@router.delete("/{contact_id}", status_code=204)
def delete_contact(
    contact_id: int,
    db: Session = Depends(get_session)  # get_db → get_session
):
    """배급사 담당자 삭제"""
    contact = db.get(DistributorContact, contact_id)
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    db.delete(contact)
    db.commit()
    return None
