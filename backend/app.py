from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from PIL import Image, ImageFilter, ImageOps, ImageEnhance
from dotenv import load_dotenv
import os
import uuid
import qrcode

load_dotenv()

app = Flask(__name__)
CORS(app)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FRONTEND_FOLDER = os.path.join(BASE_DIR, "frontend")

UPLOAD_FOLDER = os.path.join(BASE_DIR, "uploads")
GENERATED_FOLDER = os.path.join(BASE_DIR, "generated")

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(GENERATED_FOLDER, exist_ok=True)

# =========================
# SERVE FRONTEND FILES
# =========================

@app.route("/")
def home():
    return send_from_directory(FRONTEND_FOLDER, "index.html")

@app.route("/<path:filename>")
def frontend_files(filename):
    return send_from_directory(FRONTEND_FOLDER, filename)

# =========================
# PROCESS PHOTO
# =========================

@app.route("/process", methods=["POST"])
def process_photo():

    if "photo" not in request.files:
        return jsonify({"error": "No photo received"}), 400

    photo = request.files["photo"]
    style = request.form.get("style", "cartoon")
    file_id = str(uuid.uuid4())

    original_path = os.path.join(UPLOAD_FOLDER, file_id + ".png")
    output_path = os.path.join(GENERATED_FOLDER, file_id + ".png")

    photo.save(original_path)

    try:
        image = Image.open(original_path).convert("RGB")

        max_width = 1000
        if image.width > max_width:
            ratio = max_width / image.width
            image = image.resize((max_width, int(image.height * ratio)))

        if style == "cartoon":
            result = cartoon_effect(image)
        elif style == "lineart":
            result = line_art_effect(image)
        else:
            result = image

        result.save(output_path, "PNG")

        base_url = request.host_url.rstrip("/")
        image_url = base_url + "/generated/" + file_id + ".png"

        qr_path = os.path.join(GENERATED_FOLDER, file_id + "_qr.png")
        qr = qrcode.make(image_url)
        qr.save(qr_path)

        return jsonify({
            "success": True,
            "image_url": image_url,
            "qr_url": base_url + "/generated/" + file_id + "_qr.png"
        })

    except Exception as error:
        return jsonify({"error": str(error)}), 500


def cartoon_effect(image):
    result = image.filter(ImageFilter.MedianFilter(size=3))
    result = result.filter(ImageFilter.SMOOTH_MORE)
    result = ImageEnhance.Color(result).enhance(1.5)
    result = ImageEnhance.Contrast(result).enhance(1.2)

    edges = result.filter(ImageFilter.FIND_EDGES)
    edges = ImageOps.grayscale(edges)
    edges = ImageOps.autocontrast(edges)

    result = Image.blend(
        result,
        ImageOps.colorize(edges, black="black", white="white").convert("RGB"),
        0.08
    )
    return result


def line_art_effect(image):
    gray = ImageOps.grayscale(image)
    edges = gray.filter(ImageFilter.FIND_EDGES)
    edges = ImageOps.autocontrast(edges)
    edges = edges.point(lambda pixel: 0 if pixel < 100 else 255)
    return edges.convert("RGB")


@app.route("/generated/<filename>")
def generated_file(filename):
    return send_from_directory(GENERATED_FOLDER, filename)


if __name__ == "__main__":
    print("=" * 40)
    print("Starting AI Photo Booth Backend...")
    print("Open your browser to: http://127.0.0.1:5000")
    print("=" * 40)
    app.run(host="0.0.0.0", port=5000, debug=True)