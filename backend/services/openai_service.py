"""
OpenAI Service for Image Analysis
Clean service layer with proper error handling and dependency injection
"""

import base64
import json
import uuid
from typing import Optional, Dict, Any
from openai import OpenAI
import structlog

from models.internal import ImageAnalysisResult
from config.settings import settings

log = structlog.get_logger()


class OpenAIService:
    """Service for OpenAI GPT-4 Vision API interactions"""
    
    def __init__(self, api_key: str):
        """Initialize OpenAI service with API key"""
        self.client = OpenAI(api_key=api_key)
        self.model = "gpt-4o"
        log.info("OpenAI service initialized")
    
    async def analyze_parking_sign(self, image_bytes: bytes, datetime_str: Optional[str] = None) -> ImageAnalysisResult:
        """
        Analyze parking sign image using GPT-4 Vision
        
        Args:
            image_bytes: Raw image bytes
            datetime_str: Optional datetime context for analysis
            
        Returns:
            ImageAnalysisResult with analysis details
        """
        try:
            # Encode image to base64
            image_base64 = base64.b64encode(image_bytes).decode('utf-8')
            
            # Create the prompt with context
            prompt = self._create_analysis_prompt(datetime_str)
            
            # Make API call
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": prompt},
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/jpeg;base64,{image_base64}",
                                    "detail": "high"
                                }
                            }
                        ]
                    }
                ],
                max_tokens=1000,
                temperature=0.1
            )
            
            # Parse response
            content = response.choices[0].message.content
            log.info(f"OpenAI response received: {len(content)} characters")
            
            # Try to parse as JSON
            try:
                parsed_result = json.loads(content)
                return ImageAnalysisResult(
                    success=True,
                    text_extracted=parsed_result.get("parsedText", ""),
                    sign_detected=parsed_result.get("isParkingSignFound") == "true",
                    analysis_method="gpt4o_vision",
                    confidence=0.9  # High confidence for GPT-4
                )
            except json.JSONDecodeError:
                # Fallback: treat as plain text
                return ImageAnalysisResult(
                    success=True,
                    text_extracted=content,
                    sign_detected=True,  # Assume sign detected if we got a response
                    analysis_method="gpt4o_vision_fallback",
                    confidence=0.7
                )
                
        except Exception as e:
            log.error(f"OpenAI analysis failed: {e}")
            return ImageAnalysisResult(
                success=False,
                text_extracted="",
                sign_detected=False,
                analysis_method="gpt4o_vision",
                error=str(e)
            )
    
    def _create_analysis_prompt(self, datetime_str: Optional[str] = None) -> str:
        """Create the analysis prompt with optional datetime context"""
        base_prompt = """
You are a helpful assistant that interprets parking signs from images.
Given a photo of a parking sign, output the result in **valid JSON only** with the following keys:

{
  "messageType": "parking",
  "isParkingSignFound": "true" or "false",
  "canPark": "true", "false", or "uncertain",
  "reason": "Clear explanation of the parking decision",
  "rules": "Full text of parking rules found on the sign",
  "parsedText": "Raw text you can read from the image",
  "advice": "Additional helpful advice for the user"
}

Important guidelines:
- If no parking sign is visible, set isParkingSignFound to "false"
- Be conservative: if rules are unclear, use "uncertain" for canPark
- Include ALL text visible on the sign in parsedText
- Provide clear, actionable advice
- Consider time restrictions, payment requirements, and special conditions
"""
        
        if datetime_str:
            base_prompt += f"\n\nCurrent datetime context: {datetime_str}"
            base_prompt += "\nConsider time-based restrictions when making your decision."
        
        return base_prompt
    
    async def answer_followup_question(self, question: str, context: Dict[str, Any]) -> str:
        """
        Answer follow-up questions about a parking analysis
        
        Args:
            question: User's follow-up question
            context: Original analysis context
            
        Returns:
            Answer string
        """
        try:
            # Create context-aware prompt
            prompt = f"""
Based on the previous parking sign analysis, please answer this follow-up question:

Original Analysis:
- Sign Found: {context.get('isParkingSignFound', 'unknown')}
- Can Park: {context.get('canPark', 'unknown')}
- Rules: {context.get('rules', 'No rules found')}
- Parsed Text: {context.get('parsedText', 'No text found')}

User Question: {question}

Please provide a helpful, specific answer based on the parking sign analysis.
"""
            
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=300,
                temperature=0.3
            )
            
            return response.choices[0].message.content.strip()
            
        except Exception as e:
            log.error(f"Follow-up question failed: {e}")
            return f"I'm sorry, I couldn't process your question due to an error: {str(e)}"
    
    def health_check(self) -> bool:
        """Check if OpenAI service is healthy"""
        try:
            # Simple API test
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": "Hello"}],
                max_tokens=5
            )
            return bool(response.choices)
        except Exception as e:
            log.error(f"OpenAI health check failed: {e}")
            return False


# Service factory function
def create_openai_service() -> Optional[OpenAIService]:
    """Create OpenAI service if configured"""
    if not settings.has_openai_config:
        log.warning("OpenAI not configured")
        return None
    
    try:
        return OpenAIService(settings.openai_api_key)
    except Exception as e:
        log.error(f"Failed to create OpenAI service: {e}")
        return None
