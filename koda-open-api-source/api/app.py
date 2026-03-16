"""
Mulberry Open API - Main Application
"""

from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY')
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY')

CORS(app, origins=os.getenv('CORS_ORIGINS', '*').split(','))
jwt = JWTManager(app)

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'version': '1.0.0',
        'service': 'Mulberry Open API'
    }), 200

@app.route('/', methods=['GET'])
def root():
    return jsonify({
        'name': 'Mulberry Open API',
        'version': '1.0.0',
        'description': 'AI Agent Ecosystem Hub',
        'docs': 'https://api.mulberry.io/docs'
    }), 200

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=os.getenv('FLASK_DEBUG', 'False') == 'True')
