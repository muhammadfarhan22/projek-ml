import os
import numpy as np
from tensorflow.keras.preprocessing import image
from tensorflow.keras.applications.vgg16 import VGG16, preprocess_input
from tensorflow.keras.models import Model
from google.cloud import storage
import json

os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = "credential.json"

def download_from_gcs(bucket_name, source_blob_name, destination_file_name):
    storage_client = storage.Client()
    bucket = storage_client.bucket(bucket_name)
    blob = bucket.blob(source_blob_name)
    blob.download_to_filename(destination_file_name)

def load_image(img_path, target_size=(224, 224)):
    img = image.load_img(img_path, target_size=target_size)
    img_tensor = image.img_to_array(img)
    img_tensor = np.expand_dims(img_tensor, axis=0)
    img_tensor /= 255.
    return img_tensor

def predict_category(model, img_tensor):
    prediction = model.predict(img_tensor)
    return np.argmax(prediction, axis=1)

def load_embeddings(bucket_name, embeddings_path):
    local_path = '/tmp/recommendations_embeddings.npy'
    download_from_gcs(bucket_name, embeddings_path, local_path)
    return np.load(local_path, allow_pickle=True).item()

def extract_embedding(img_path, model):
    img = image.load_img(img_path, target_size=(224, 224))
    img_tensor = image.img_to_array(img)
    img_tensor = np.expand_dims(img_tensor, axis=0)
    img_tensor = preprocess_input(img_tensor)
    embedding = model.predict(img_tensor)
    return embedding

def find_most_similar_image(upload_embedding, embeddings, category_prefix):
    similarities = []
    for file_name, embedding in embeddings.items():
        if file_name.startswith(category_prefix):
            cosine_similarity = np.dot(upload_embedding, embedding.T) / (np.linalg.norm(upload_embedding) * np.linalg.norm(embedding))
            similarities.append((file_name, cosine_similarity))
    
    most_similar_image = max(similarities, key=lambda x: x[1])[0]
    return most_similar_image

def load_categories():
    with open('api/categories.json', 'r') as f:
        return json.load(f)
