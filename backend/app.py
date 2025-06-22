from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
import pickle
import os
import sqlite3
import json
from datetime import datetime, timedelta
import random

app = Flask(__name__)
CORS(app)

# Database setup
def init_db():
    conn = sqlite3.connect('creditrust.db')
    cursor = conn.cursor()
    
    # Create users table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            address TEXT PRIMARY KEY,
            credit_score INTEGER DEFAULT 600,
            income REAL DEFAULT 50000,
            employment_years INTEGER DEFAULT 2,
            debt_to_income REAL DEFAULT 0.3,
            payment_history TEXT DEFAULT '[]',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Create credit_applications table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS credit_applications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_address TEXT,
            requested_amount REAL,
            credit_score INTEGER,
            apr REAL,
            risk_level TEXT,
            approved BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_address) REFERENCES users (address)
        )
    ''')
    
    # Create repayments table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS repayments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_address TEXT,
            amount REAL,
            due_date DATE,
            paid_date DATE,
            status TEXT DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_address) REFERENCES users (address)
        )
    ''')
    
    conn.commit()
    conn.close()

# Initialize database
init_db()

class CreditScoringModel:
    def __init__(self):
        # Simulate ML model weights
        self.feature_weights = {
            'income': 0.25,
            'employment_years': 0.15,
            'debt_to_income': -0.30,
            'payment_history_score': 0.25,
            'credit_utilization': -0.15,
            'account_age': 0.10
        }
        
    def predict_credit_score(self, features):
        """
        Predict credit score based on input features
        Returns score between 300-850
        """
        base_score = 500
        
        # Income factor (higher income = better score)
        income_factor = min(features.get('income', 50000) / 100000 * 100, 100)
        
        # Employment stability
        employment_factor = min(features.get('employment_years', 1) * 10, 50)
        
        # Debt-to-income ratio (lower is better)
        dti_ratio = features.get('debt_to_income', 0.3)
        dti_factor = max(0, (0.5 - dti_ratio) * 200)
        
        # Payment history (0-100 score)
        payment_history = features.get('payment_history_score', 70)
        
        # Credit utilization (lower is better)
        utilization = features.get('credit_utilization', 0.3)
        utilization_factor = max(0, (0.3 - utilization) * 100)
        
        # Account age (older is better)
        account_age = features.get('account_age', 1)
        age_factor = min(account_age * 5, 30)
        
        # Calculate weighted score
        calculated_score = (
            base_score +
            income_factor * self.feature_weights['income'] * 100 +
            employment_factor * self.feature_weights['employment_years'] +
            dti_factor * abs(self.feature_weights['debt_to_income']) +
            payment_history * self.feature_weights['payment_history_score'] +
            utilization_factor * abs(self.feature_weights['credit_utilization']) +
            age_factor * self.feature_weights['account_age']
        )
        
        # Ensure score is within valid range
        return max(300, min(850, int(calculated_score)))
    
    def calculate_apr(self, credit_score):
        """Calculate APR based on credit score"""
        if credit_score >= 800:
            return 5.0
        elif credit_score >= 750:
            return 7.0
        elif credit_score >= 700:
            return 10.0
        elif credit_score >= 650:
            return 13.0
        elif credit_score >= 600:
            return 16.0
        else:
            return 20.0
    
    def assess_risk_level(self, credit_score):
        """Assess risk level based on credit score"""
        if credit_score >= 750:
            return "LOW"
        elif credit_score >= 650:
            return "MEDIUM"
        elif credit_score >= 550:
            return "HIGH"
        else:
            return "VERY_HIGH"

# Initialize model
scoring_model = CreditScoringModel()

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy", "timestamp": datetime.now().isoformat()})

@app.route('/api/user/profile', methods=['GET'])
def get_user_profile():
    address = request.args.get('address')
    if not address:
        return jsonify({"error": "Address parameter is required"}), 400
    
    conn = sqlite3.connect('creditrust.db')
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM users WHERE address = ?", (address,))
    user = cursor.fetchone()
    
    if not user:
        # Create new user with default values
        cursor.execute('''
            INSERT INTO users (address, credit_score, income, employment_years, debt_to_income)
            VALUES (?, ?, ?, ?, ?)
        ''', (address, 600, 50000, 2, 0.3))
        conn.commit()
        
        # Fetch the newly created user
        cursor.execute("SELECT * FROM users WHERE address = ?", (address,))
        user = cursor.fetchone()
    
    conn.close()
    
    # Convert to dictionary
    user_data = {
        "address": user[0],
        "credit_score": user[1],
        "income": user[2],
        "employment_years": user[3],
        "debt_to_income": user[4],
        "payment_history": json.loads(user[5]) if user[5] else [],
        "created_at": user[6],
        "updated_at": user[7]
    }
    
    return jsonify(user_data)

@app.route('/api/credit/score', methods=['POST'])
def calculate_credit_score():
    data = request.get_json()
    
    if not data or 'address' not in data:
        return jsonify({"error": "User address is required"}), 400
    
    address = data['address']
    
    # Get user profile or use provided data
    features = {
        'income': data.get('income', 50000),
        'employment_years': data.get('employment_years', 2),
        'debt_to_income': data.get('debt_to_income', 0.3),
        'payment_history_score': data.get('payment_history_score', 70),
        'credit_utilization': data.get('credit_utilization', 0.3),
        'account_age': data.get('account_age', 1)
    }
    
    # Calculate credit score
    credit_score = scoring_model.predict_credit_score(features)
    apr = scoring_model.calculate_apr(credit_score)
    risk_level = scoring_model.assess_risk_level(credit_score)
    
    # Update user profile
    conn = sqlite3.connect('creditrust.db')
    cursor = conn.cursor()
    
    cursor.execute('''
        INSERT OR REPLACE INTO users (address, credit_score, income, employment_years, debt_to_income, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (address, credit_score, features['income'], features['employment_years'], 
          features['debt_to_income'], datetime.now().isoformat()))
    
    conn.commit()
    conn.close()
    
    return jsonify({
        "address": address,
        "credit_score": credit_score,
        "apr": apr,
        "risk_level": risk_level,
        "features_used": features,
        "timestamp": datetime.now().isoformat()
    })

@app.route('/api/credit/apply', methods=['POST'])
def apply_for_credit():
    data = request.get_json()
    
    required_fields = ['address', 'requested_amount']
    if not all(field in data for field in required_fields):
        return jsonify({"error": "Missing required fields"}), 400
    
    address = data['address']
    requested_amount = data['requested_amount']
    
    # Get or calculate credit score
    conn = sqlite3.connect('creditrust.db')
    cursor = conn.cursor()
    
    cursor.execute("SELECT credit_score, income, debt_to_income FROM users WHERE address = ?", (address,))
    user = cursor.fetchone()
    
    if not user:
        return jsonify({"error": "User profile not found"}), 404
    
    credit_score, income, debt_to_income = user
    apr = scoring_model.calculate_apr(credit_score)
    risk_level = scoring_model.assess_risk_level(credit_score)
    
    # Simple approval logic
    max_loan_amount = income * 0.1  # 10% of annual income
    approved = (
        credit_score >= 550 and
        requested_amount <= max_loan_amount and
        debt_to_income <= 0.5
    )
    
    # Save application
    cursor.execute('''
        INSERT INTO credit_applications (user_address, requested_amount, credit_score, apr, risk_level, approved)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (address, requested_amount, credit_score, apr, risk_level, approved))
    
    application_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    return jsonify({
        "application_id": application_id,
        "address": address,
        "requested_amount": requested_amount,
        "credit_score": credit_score,
        "apr": apr,
        "risk_level": risk_level,
        "approved": approved,
        "max_loan_amount": max_loan_amount,
        "reason": "Approved" if approved else "Credit score too low or amount too high"
    })

@app.route('/api/repayment/schedule', methods=['POST'])
def create_repayment_schedule():
    data = request.get_json()
    
    if not data or 'address' not in data or 'loan_amount' not in data:
        return jsonify({"error": "Address and loan amount required"}), 400
    
    address = data['address']
    loan_amount = data['loan_amount']
    term_months = data.get('term_months', 12)
    
    # Get user's APR
    conn = sqlite3.connect('creditrust.db')
    cursor = conn.cursor()
    
    cursor.execute("SELECT credit_score FROM users WHERE address = ?", (address,))
    user = cursor.fetchone()
    
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    credit_score = user[0]
    apr = scoring_model.calculate_apr(credit_score)
    
    # Calculate monthly payment
    monthly_rate = apr / 100 / 12
    monthly_payment = loan_amount * (monthly_rate * (1 + monthly_rate)**term_months) / ((1 + monthly_rate)**term_months - 1)
    
    # Create repayment schedule
    schedule = []
    remaining_balance = loan_amount
    
    for month in range(term_months):
        due_date = datetime.now() + timedelta(days=30 * (month + 1))
        interest_payment = remaining_balance * monthly_rate
        principal_payment = monthly_payment - interest_payment
        remaining_balance -= principal_payment
        
        schedule.append({
            "month": month + 1,
            "due_date": due_date.strftime("%Y-%m-%d"),
            "payment_amount": round(monthly_payment, 2),
            "principal": round(principal_payment, 2),
            "interest": round(interest_payment, 2),
            "remaining_balance": round(max(0, remaining_balance), 2)
        })
        
        # Save to database
        cursor.execute('''
            INSERT INTO repayments (user_address, amount, due_date, status)
            VALUES (?, ?, ?, ?)
        ''', (address, monthly_payment, due_date.strftime("%Y-%m-%d"), 'pending'))
    
    conn.commit()
    conn.close()
    
    return jsonify({
        "address": address,
        "loan_amount": loan_amount,
        "apr": apr,
        "term_months": term_months,
        "monthly_payment": round(monthly_payment, 2),
        "total_payment": round(monthly_payment * term_months, 2),
        "total_interest": round(monthly_payment * term_months - loan_amount, 2),
        "schedule": schedule
    })

@app.route('/api/repayment/status', methods=['GET'])
def get_repayment_status():
    address = request.args.get('address')
    if not address:
        return jsonify({"error": "Address parameter is required"}), 400
    
    conn = sqlite3.connect('creditrust.db')
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT id, amount, due_date, paid_date, status, created_at
        FROM repayments 
        WHERE user_address = ? 
        ORDER BY due_date
    ''', (address,))
    
    repayments = cursor.fetchall()
    conn.close()
    
    repayment_list = []
    for rep in repayments:
        repayment_list.append({
            "id": rep[0],
            "amount": rep[1],
            "due_date": rep[2],
            "paid_date": rep[3],
            "status": rep[4],
            "created_at": rep[5],
            "is_overdue": datetime.strptime(rep[2], "%Y-%m-%d").date() < datetime.now().date() and rep[4] == 'pending'
        })
    
    return jsonify({
        "address": address,
        "repayments": repayment_list,
        "total_pending": sum(r["amount"] for r in repayment_list if r["status"] == "pending"),
        "overdue_count": sum(1 for r in repayment_list if r["is_overdue"])
    })

@app.route('/api/simulate/market-data', methods=['GET'])
def get_market_simulation():
    """Simulate market data for demo purposes"""
    
    # Generate random market data
    market_data = {
        "total_volume": random.uniform(1000000, 5000000),
        "active_loans": random.randint(150, 500),
        "average_apr": random.uniform(8.5, 15.2),
        "liquidation_rate": random.uniform(2.1, 5.8),
        "total_lenders": random.randint(50, 200),
        "total_collateral_locked": random.uniform(2000000, 8000000),
        "platform_fees_earned": random.uniform(10000, 50000),
        "timestamp": datetime.now().isoformat()
    }
    
    return jsonify(market_data)

@app.route('/api/risk/analysis', methods=['POST'])
def risk_analysis():
    """Perform risk analysis for a given profile"""
    data = request.get_json()
    
    if not data:
        return jsonify({"error": "Request data required"}), 400
    
    # Extract risk factors
    factors = {
        "credit_score": data.get("credit_score", 600),
        "debt_to_income": data.get("debt_to_income", 0.3),
        "employment_stability": data.get("employment_years", 2),
        "income": data.get("income", 50000),
        "collateral_ratio": data.get("collateral_ratio", 1.5)
    }
    
    # Risk scoring algorithm
    risk_score = 0
    risk_factors = []
    
    # Credit score risk
    if factors["credit_score"] < 600:
        risk_score += 30
        risk_factors.append("Low credit score")
    elif factors["credit_score"] < 700:
        risk_score += 15
        risk_factors.append("Moderate credit score")
    
    # Debt-to-income risk
    if factors["debt_to_income"] > 0.4:
        risk_score += 25
        risk_factors.append("High debt-to-income ratio")
    elif factors["debt_to_income"] > 0.3:
        risk_score += 10
        risk_factors.append("Moderate debt-to-income ratio")
    
    # Employment stability
    if factors["employment_stability"] < 1:
        risk_score += 20
        risk_factors.append("Short employment history")
    elif factors["employment_stability"] < 2:
        risk_score += 10
        risk_factors.append("Limited employment history")
    
    # Income level
    if factors["income"] < 30000:
        risk_score += 15
        risk_factors.append("Low income level")
    
    # Collateral ratio
    if factors["collateral_ratio"] < 1.2:
        risk_score += 35
        risk_factors.append("Insufficient collateral")
    elif factors["collateral_ratio"] < 1.5:
        risk_score += 15
        risk_factors.append("Low collateral ratio")
    
    # Determine risk level
    if risk_score <= 20:
        risk_level = "LOW"
        recommendation = "Approve with standard terms"
    elif risk_score <= 40:
        risk_level = "MEDIUM"
        recommendation = "Approve with higher APR"
    elif risk_score <= 60:
        risk_level = "HIGH"
        recommendation = "Approve with maximum APR and monitoring"
    else:
        risk_level = "VERY_HIGH"
        recommendation = "Decline or require additional collateral"
    
    return jsonify({
        "risk_score": risk_score,
        "risk_level": risk_level,
        "risk_factors": risk_factors,
        "recommendation": recommendation,
        "factors_analyzed": factors,
        "timestamp": datetime.now().isoformat()
    })

if __name__ == '__main__':
    print("Starting CrediTrust ML Scoring API...")
    print("Database initialized successfully")
    app.run(debug=True, host='0.0.0.0', port=5000)
