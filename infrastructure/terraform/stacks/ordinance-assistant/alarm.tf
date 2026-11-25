resource "aws_sns_topic" "spend" {
  provider = aws.us_east_1
  name     = "tow-ordinance-bedrock-spend"
}

resource "aws_cloudwatch_metric_alarm" "bedrock_spend" {
  provider            = aws.us_east_1
  alarm_name          = "tow-ordinance-bedrock-daily-spend"
  alarm_description   = "Amazon Bedrock estimated charges crossed the ordinance assistant budget"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "EstimatedCharges"
  namespace           = "AWS/Billing"
  period              = 86400
  statistic           = "Maximum"
  threshold           = var.daily_spend_alarm_usd
  treat_missing_data  = "notBreaching"

  dimensions = {
    Currency    = "USD"
    ServiceName = "AmazonBedrock"
  }

  alarm_actions = [aws_sns_topic.spend.arn]
}
