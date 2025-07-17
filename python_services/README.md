# Food Detection Python Service

This directory contains the Python microservice for food detection using YOLOv8 and computer vision models.

## Setup

### Prerequisites

- Python 3.8 or higher
- pip package manager

### Installation

1. Install the required Python dependencies:

```bash
pip install -r requirements.txt
```

### Dependencies

The service uses the following key libraries:

- **ultralytics**: YOLOv8 implementation for object detection
- **opencv-python**: Computer vision library for image processing
- **torch**: PyTorch deep learning framework
- **Pillow**: Python Imaging Library for image handling
- **numpy**: Numerical computing library

## Usage

### Command Line Interface

The food detection service can be run from the command line:

```bash
python food_detection.py --image path/to/image.jpg --confidence 0.5 --max-detections 5
```

### Parameters

- `--image`: Path to the input image file (required)
- `--confidence`: Confidence threshold for detections (default: 0.5)
- `--max-detections`: Maximum number of detections to return (default: 5)
- `--model-path`: Path to custom model file (optional)

### Output Format

The service outputs JSON with the following structure:

```json
{
  "detections": [
    {
      "class_name": "pizza",
      "confidence": 0.85,
      "bbox": [100, 100, 200, 150],
      "alternatives": [
        {
          "class_name": "italian_food",
          "confidence": 0.65
        }
      ]
    }
  ],
  "processing_time": 1.2,
  "model_info": {
    "name": "YOLOv8-Food101",
    "version": "1.0.0"
  }
}
```

## Integration with Node.js Backend

The Python service is called by the Node.js backend through the `FoodDetectionService` class, which:

1. Saves uploaded images to temporary files
2. Spawns the Python process with appropriate arguments
3. Parses the JSON output
4. Converts results to TypeScript interfaces
5. Handles errors and timeouts

## Model Information

### Current Implementation

The service currently uses YOLOv8 nano model (`yolov8n.pt`) for general object detection with mapping to food categories. This is a temporary solution until a food-specific model is trained.

### Food Categories

The service can detect 101 different food categories based on the Food-101 dataset:

- Main dishes (pizza, hamburger, steak, etc.)
- Desserts (cake, ice cream, donuts, etc.)
- Appetizers (salad, soup, wings, etc.)
- International cuisine (sushi, tacos, pad thai, etc.)

### Future Improvements

1. **Custom Food Model**: Train YOLOv8 specifically on Food-101 dataset
2. **Better Accuracy**: Use larger model variants (YOLOv8s, YOLOv8m, YOLOv8l)
3. **Multiple Food Detection**: Improve handling of multiple food items in single image
4. **Confidence Calibration**: Better confidence scoring for food-specific detections

## Error Handling

The service handles various error conditions:

- **Missing Dependencies**: Clear error messages for missing Python packages
- **Invalid Images**: Validation of image format and readability
- **Model Loading Errors**: Graceful handling of model loading failures
- **Processing Timeouts**: 30-second timeout for long-running processes

## Performance Considerations

- **Model Size**: YOLOv8 nano is optimized for speed over accuracy
- **Image Preprocessing**: Automatic resizing of large images to improve processing speed
- **Memory Usage**: Efficient handling of image buffers and model inference
- **Concurrent Processing**: Service can handle multiple simultaneous requests

## Development and Testing

### Testing the Service

Test the service with a sample image:

```bash
# Download a test image
curl -o test_pizza.jpg "https://example.com/pizza.jpg"

# Run detection
python food_detection.py --image test_pizza.jpg --confidence 0.3
```

### Debugging

Enable verbose logging by modifying the logging level in the script:

```python
logging.basicConfig(level=logging.DEBUG)
```

### Common Issues

1. **CUDA/GPU Issues**: The service will automatically fall back to CPU if GPU is not available
2. **Memory Errors**: Reduce image size or use a smaller model variant
3. **Slow Performance**: Consider using GPU acceleration or smaller images

## License

This service uses open-source models and libraries:

- YOLOv8: GPL-3.0 License (free for commercial use)
- OpenCV: Apache 2.0 License
- PyTorch: BSD License

All components are free to use in commercial applications.