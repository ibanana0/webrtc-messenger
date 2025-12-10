from flask import Blueprint, request, jsonify
from app import db
from app.models.user import User
from app.utils.jwt_utils import generate_token, token_required

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    
    required_fields = ['username', 'email', 'password']
    
    # periksa apakah request memenuhi atau belum
    for field in required_fields:
        if not data.get(field):
            return jsonify({'error': f'{field} is required'}), 400
        
    username = data['username'].strip().lower()
    email = data['email'].strip().lower()
    password = data['password']
    public_key = data.get('public_key')
    
    # cek password
    if len(password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters'}), 400
    
    # cek apakah user sudah ada
    if User.query.filter_by(username=username).first():
        return jsonify({'error': 'Username already taken'}), 409
    # cek apakah email sudah ada
    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'Email already registered'}), 409
    
    # buat user baru
    user = User(
        username = username,
        email = email,
        public_key = public_key
    )
    user.set_password(password=password)
    
    # masukkan ke database
    db.session.add(user)
    db.session.commit()
    
    # generate token
    token = generate_token(user_id=user.id, username=user.username)
    
    return jsonify({
        'message' : 'User registered successfully',
        'user' : user.to_dict(),
        'token' : token
    }), 201

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    
    username = data.get('username', '').strip().lower()
    password = data.get('password', '')
    
    if not username or not password :
        return jsonify({'error': 'Username and password are required'}), 400
    
    # mencari user berdasarkan username
    user = User.query.filter_by(username=username).first()
    
    if not user or not user.check_password(password):
        return jsonify({'error': 'Invalid username or password'}), 401
    
    # generate token
    token = generate_token(user_id=user.id, username=user.username)
    
    return jsonify({
        'message' : 'Login successful',
        'user' : user.to_dict(include_public_key=True),
        'token' : token
    }), 200
    
@auth_bp.route('/me', methods=['GET'])
@token_required
def get_current_user():
    user = User.query.get(request.user_id)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    return jsonify({'user': user.to_dict(include_public_key=True)}), 200