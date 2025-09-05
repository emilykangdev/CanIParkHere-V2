"""
AWS Service for S3 and Athena Operations
Clean service layer with proper error handling
"""

import boto3
from botocore.exceptions import ClientError
from typing import Optional, List, Dict, Any
import structlog

from config.settings import settings

log = structlog.get_logger()


class AWSService:
    """Service for AWS S3 and Athena operations"""
    
    def __init__(self, access_key_id: str, secret_access_key: str, region: str = "us-west-2"):
        """Initialize AWS service with credentials"""
        self.region = region
        
        # Initialize S3 client
        self.s3_client = boto3.client(
            's3',
            aws_access_key_id=access_key_id,
            aws_secret_access_key=secret_access_key,
            region_name=region
        )
        
        # Initialize Athena client
        self.athena_client = boto3.client(
            'athena',
            aws_access_key_id=access_key_id,
            aws_secret_access_key=secret_access_key,
            region_name=region
        )
        
        log.info(f"AWS service initialized for region: {region}")
    
    def list_s3_files(self, bucket: str) -> List[str]:
        """List objects in S3 bucket"""
        try:
            response = self.s3_client.list_objects_v2(Bucket=bucket)
            files = [obj["Key"] for obj in response.get("Contents", [])]
            log.info(f"Listed {len(files)} files from bucket {bucket}")
            return files
        except ClientError as e:
            log.error(f"Failed to list S3 files: {e}")
            return []
    
    def get_s3_file(self, bucket: str, key: str) -> Optional[str]:
        """Fetch object contents from S3"""
        try:
            response = self.s3_client.get_object(Bucket=bucket, Key=key)
            data = response["Body"].read().decode("utf-8")
            log.info(f"Retrieved S3 file: {key}")
            return data
        except ClientError as e:
            log.error(f"Failed to get S3 file {key}: {e}")
            return None
    
    def upload_to_s3(self, bucket: str, key: str, data: bytes, content_type: str = "application/octet-stream") -> bool:
        """Upload data to S3"""
        try:
            self.s3_client.put_object(
                Bucket=bucket,
                Key=key,
                Body=data,
                ContentType=content_type
            )
            log.info(f"Uploaded to S3: {key}")
            return True
        except ClientError as e:
            log.error(f"Failed to upload to S3: {e}")
            return False
    
    def execute_athena_query(self, query: str, database: str, output_location: str) -> Optional[str]:
        """Execute Athena query and return execution ID"""
        try:
            response = self.athena_client.start_query_execution(
                QueryString=query,
                QueryExecutionContext={'Database': database},
                ResultConfiguration={'OutputLocation': output_location}
            )
            execution_id = response['QueryExecutionId']
            log.info(f"Started Athena query: {execution_id}")
            return execution_id
        except ClientError as e:
            log.error(f"Failed to execute Athena query: {e}")
            return None
    
    def get_athena_query_results(self, execution_id: str) -> Optional[Dict[str, Any]]:
        """Get results from Athena query execution"""
        try:
            response = self.athena_client.get_query_results(QueryExecutionId=execution_id)
            log.info(f"Retrieved Athena results for: {execution_id}")
            return response
        except ClientError as e:
            log.error(f"Failed to get Athena results: {e}")
            return None
    
    def health_check(self) -> Dict[str, bool]:
        """Check health of AWS services"""
        health = {"s3": False, "athena": False}
        
        # Test S3
        try:
            self.s3_client.list_buckets()
            health["s3"] = True
        except Exception as e:
            log.error(f"S3 health check failed: {e}")
        
        # Test Athena
        try:
            self.athena_client.list_work_groups()
            health["athena"] = True
        except Exception as e:
            log.error(f"Athena health check failed: {e}")
        
        return health


# Service factory function
def create_aws_service() -> Optional[AWSService]:
    """Create AWS service if configured"""
    if not settings.has_aws_config:
        log.warning("AWS not configured")
        return None
    
    try:
        return AWSService(
            access_key_id=settings.aws_access_key_id,
            secret_access_key=settings.aws_secret_access_key,
            region=settings.aws_region
        )
    except Exception as e:
        log.error(f"Failed to create AWS service: {e}")
        return None
