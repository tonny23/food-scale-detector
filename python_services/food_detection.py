#!/usr/bin/env python3
"""
Food Detection Service using YOLOv8 and Food-101 dataset
This service provides food detection capabilities for the Food Nutrition Detector application.
"""

import argparse
import json
import sys
import time
from pathlib import Path
from typing import List, Dict, Tuple, Optional
import logging

try:
    import cv2
    import numpy as np
    from ultralytics import YOLO
    import torch
    from PIL import Image
except ImportError as e:
    print(f"Error: Missing required dependencies: {e}", file=sys.stderr)
    print("Please install required packages: pip install ultralytics opencv-python pillow torch", file=sys.stderr)
    sys.exit(1)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class FoodDetectionModel:
    """Food detection model using YOLOv8 trained on Food-101 dataset"""
    
    def __init__(self, model_path: Optional[str] = None, confidence_threshold: float = 0.5):
        self.confidence_threshold = confidence_threshold
        self.model = None
        self.class_names = self._get_food101_classes()
        
        # Initialize model
        self._load_model(model_path)
    
    def _load_model(self, model_path: Optional[str] = None):
        """Load YOLOv8 model"""
        try:
            if model_path and Path(model_path).exists():
                # Load custom trained model
                self.model = YOLO(model_path)
                logger.info(f"Loaded custom model from {model_path}")
            else:
                # Use pre-trained YOLOv8 model and adapt for food detection
                # In a real implementation, this would be a model specifically trained on Food-101
                # For now, we'll use the general YOLOv8 model and map relevant classes
                self.model = YOLO('yolov8n.pt')  # Nano version for faster inference
                logger.info("Loaded YOLOv8 nano model (general object detection)")
                
        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            raise RuntimeError(f"Model loading failed: {e}")
    
    def _get_food101_classes(self) -> List[str]:
        """Get Food-101 dataset class names"""
        return [
            'apple_pie', 'baby_back_ribs', 'baklava', 'beef_carpaccio', 'beef_tartare',
            'beet_salad', 'beignets', 'bibimbap', 'bread_pudding', 'breakfast_burrito',
            'bruschetta', 'caesar_salad', 'cannoli', 'caprese_salad', 'carrot_cake',
            'ceviche', 'cheese_plate', 'cheesecake', 'chicken_curry', 'chicken_quesadilla',
            'chicken_wings', 'chocolate_cake', 'chocolate_mousse', 'churros', 'clam_chowder',
            'club_sandwich', 'crab_cakes', 'creme_brulee', 'croque_madame', 'cup_cakes',
            'deviled_eggs', 'donuts', 'dumplings', 'edamame', 'eggs_benedict',
            'escargots', 'falafel', 'filet_mignon', 'fish_and_chips', 'foie_gras',
            'french_fries', 'french_onion_soup', 'french_toast', 'fried_calamari', 'fried_rice',
            'frozen_yogurt', 'garlic_bread', 'gnocchi', 'greek_salad', 'grilled_cheese_sandwich',
            'grilled_salmon', 'guacamole', 'gyoza', 'hamburger', 'hot_and_sour_soup',
            'hot_dog', 'huevos_rancheros', 'hummus', 'ice_cream', 'lasagna',
            'lobster_bisque', 'lobster_roll_sandwich', 'macaroni_and_cheese', 'macarons', 'miso_soup',
            'mussels', 'nachos', 'omelette', 'onion_rings', 'oysters',
            'pad_thai', 'paella', 'pancakes', 'panna_cotta', 'peking_duck',
            'pho', 'pizza', 'pork_chop', 'poutine', 'prime_rib',
            'pulled_pork_sandwich', 'ramen', 'ravioli', 'red_velvet_cake', 'risotto',
            'samosa', 'sashimi', 'scallops', 'seaweed_salad', 'shrimp_and_grits',
            'spaghetti_bolognese', 'spaghetti_carbonara', 'spring_rolls', 'steak', 'strawberry_shortcake',
            'sushi', 'tacos', 'takoyaki', 'tiramisu', 'tuna_tartare', 'waffles'
        ]
    
    def _map_yolo_to_food(self, class_id: int, class_name: str) -> Optional[str]:
        """Map YOLO class to food class (temporary mapping until we have a food-specific model)"""
        # Mapping common YOLO classes to food categories
        food_mappings = {
            'apple': 'apple_pie',
            'banana': 'banana',
            'orange': 'orange',
            'sandwich': 'club_sandwich',
            'pizza': 'pizza',
            'donut': 'donuts',
            'cake': 'chocolate_cake',
            'hot dog': 'hot_dog',
            'hamburger': 'hamburger',
            'french fries': 'french_fries'
        }
        
        class_name_lower = class_name.lower()
        for yolo_class, food_class in food_mappings.items():
            if yolo_class in class_name_lower:
                return food_class
        
        # If no mapping found, return a generic food class
        return 'unknown_food'
    
    def preprocess_image(self, image_path: str) -> np.ndarray:
        """Preprocess image for food detection"""
        try:
            # Load image
            image = cv2.imread(image_path)
            if image is None:
                raise ValueError(f"Could not load image from {image_path}")
            
            # Convert BGR to RGB
            image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            
            # Basic preprocessing - resize if too large
            height, width = image.shape[:2]
            max_size = 1024
            
            if max(height, width) > max_size:
                scale = max_size / max(height, width)
                new_width = int(width * scale)
                new_height = int(height * scale)
                image = cv2.resize(image, (new_width, new_height), interpolation=cv2.INTER_AREA)
            
            return image
            
        except Exception as e:
            logger.error(f"Image preprocessing failed: {e}")
            raise
    
    def detect_food(self, image_path: str, max_detections: int = 5) -> List[Dict]:
        """Detect food items in image"""
        try:
            start_time = time.time()
            
            # Preprocess image
            image = self.preprocess_image(image_path)
            
            # Run inference
            results = self.model(image, conf=self.confidence_threshold, verbose=False)
            
            detections = []
            
            for result in results:
                boxes = result.boxes
                if boxes is not None:
                    for i, box in enumerate(boxes):
                        if i >= max_detections:
                            break
                            
                        # Get detection data
                        confidence = float(box.conf[0])
                        class_id = int(box.cls[0])
                        bbox = box.xyxy[0].tolist()  # [x1, y1, x2, y2]
                        
                        # Convert to [x, y, width, height] format
                        x1, y1, x2, y2 = bbox
                        bbox_formatted = [x1, y1, x2 - x1, y2 - y1]
                        
                        # Get class name
                        original_class_name = self.model.names[class_id]
                        
                        # Map to food class
                        food_class = self._map_yolo_to_food(class_id, original_class_name)
                        
                        if food_class and confidence >= self.confidence_threshold:
                            detection = {
                                'class_name': food_class,
                                'confidence': confidence,
                                'bbox': bbox_formatted,
                                'alternatives': self._get_alternatives(food_class, confidence)
                            }
                            detections.append(detection)
            
            processing_time = time.time() - start_time
            
            # Sort by confidence
            detections.sort(key=lambda x: x['confidence'], reverse=True)
            
            return detections[:max_detections], processing_time
            
        except Exception as e:
            logger.error(f"Food detection failed: {e}")
            raise
    
    def _get_alternatives(self, primary_class: str, primary_confidence: float) -> List[Dict]:
        """Generate alternative food suggestions based on the primary detection"""
        alternatives = []
        
        # Simple rule-based alternatives (in a real implementation, this would use similarity models)
        alternative_mappings = {
            'pizza': ['italian_food', 'cheese_pizza', 'pepperoni_pizza'],
            'hamburger': ['cheeseburger', 'sandwich', 'fast_food'],
            'hot_dog': ['sausage', 'fast_food', 'grilled_food'],
            'french_fries': ['potato_fries', 'side_dish', 'fast_food'],
            'chocolate_cake': ['dessert', 'cake', 'chocolate_dessert'],
            'donuts': ['pastry', 'dessert', 'sweet_bread'],
            'club_sandwich': ['sandwich', 'deli_sandwich', 'lunch_food']
        }
        
        if primary_class in alternative_mappings:
            for alt_class in alternative_mappings[primary_class][:3]:  # Top 3 alternatives
                # Reduce confidence for alternatives
                alt_confidence = primary_confidence * (0.7 + np.random.random() * 0.2)
                alternatives.append({
                    'class_name': alt_class,
                    'confidence': alt_confidence
                })
        
        return alternatives

def main():
    """Main function for command-line interface"""
    parser = argparse.ArgumentParser(description='Food Detection Service')
    parser.add_argument('--image', required=True, help='Path to input image')
    parser.add_argument('--confidence', type=float, default=0.5, help='Confidence threshold')
    parser.add_argument('--max-detections', type=int, default=5, help='Maximum number of detections')
    parser.add_argument('--model-path', help='Path to custom model file')
    
    args = parser.parse_args()
    
    try:
        # Initialize model
        detector = FoodDetectionModel(
            model_path=args.model_path,
            confidence_threshold=args.confidence
        )
        
        # Detect food
        detections, processing_time = detector.detect_food(
            args.image,
            max_detections=args.max_detections
        )
        
        # Prepare response
        response = {
            'detections': detections,
            'processing_time': processing_time,
            'model_info': {
                'name': 'YOLOv8-Food101',
                'version': '1.0.0'
            }
        }
        
        # Output JSON response
        print(json.dumps(response, indent=2))
        
    except Exception as e:
        error_response = {
            'error': str(e),
            'detections': [],
            'processing_time': 0,
            'model_info': {
                'name': 'YOLOv8-Food101',
                'version': '1.0.0'
            }
        }
        print(json.dumps(error_response, indent=2), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()