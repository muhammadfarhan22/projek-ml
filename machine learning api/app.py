from flask import Flask, request, jsonify, send_file, make_response
from api.utils import load_image, predict_category, load_embeddings, extract_embedding, find_most_similar_image, load_categories, download_from_gcs
import os
from tensorflow.keras.models import load_model, Model
from tensorflow.keras.applications.vgg16 import VGG16
from google.cloud import storage
import io


app = Flask(__name__)
# Load VGG16 base model
base_model_path = 'models/vgg16_weights_tf_dim_ordering_tf_kernels.h5'
base_model = VGG16(weights=base_model_path)
print("VGG16 model loaded successfully.")

# Load custom trained model
custom_model_path = 'models/fashion_model.h5'
model = load_model(custom_model_path)
print("Custom model loaded successfully.")

embedding_model = Model(inputs=base_model.input, outputs=base_model.get_layer('fc1').output)
categories = load_categories()
bucket_name = 'dataset-baru'
embeddings = load_embeddings(bucket_name, 'recommendations_embeddings.npy')

@app.route('/predict', methods=['POST'])
@app.route('/predict', methods=['POST'])
def predict():
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    # Save the file temporarily
    file_path = os.path.join('/tmp', file.filename)
    file.save(file_path)

    # Preprocess the image
    img_tensor = load_image(file_path)
    
    # Predict the category
    category_index = predict_category(model, img_tensor)
    category_index = int(category_index[0])
    category_name = categories[str(category_index)]
    
    # Extract embedding of the uploaded image
    upload_embedding = extract_embedding(file_path, embedding_model)
    
    # Find the most similar image in the recommendation set
    recommendation_image_name = find_most_similar_image(upload_embedding, embeddings, str(category_index))
    recommendation_image_path = f'https://storage.googleapis.com/{bucket_name}/recommedationsCopy/{recommendation_image_name}'
    
    if recommendation_image_path is None:
        return jsonify({'error': 'No recommendation image found for this category'}), 404
    
    # Clean up
    os.remove(file_path)

    # Return category name and image path
    return jsonify({
        'category_index': category_index,
        'category_name': category_name,
        'recommendation_image_url': recommendation_image_path
    })

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 8080))
    app.run(host='0.0.0.0', port=port)

