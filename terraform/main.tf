provider "aws" {
  region = "eu-central-1"

  s3_use_path_style           = true
  skip_credentials_validation = true
  skip_requesting_account_id  = true
  skip_metadata_api_check     = true

  endpoints {
    s3 = "http://localhost:4566"
  }
}

resource "aws_s3_bucket" "nest_content_hub" {
  bucket = "nest-content-hub"

  tags = {
    Name = "Nest Content Hub bucket"
  }
}
