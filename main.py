from fastapi import FastAPI

from app.routes import admin_movies, admin_distributors, admin_distributor_contacts, admin_movie_files, admin_image_renditions

app = FastAPI()
app.include_router(admin_movies.router)
app.include_router(admin_distributors.router)
app.include_router(admin_distributor_contacts.router)
app.include_router(admin_movie_files.router)
app.include_router(admin_image_renditions.router)
