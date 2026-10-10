export function resolveSwiftScaleBaseURL(input: {
  environment?: string
  configured?: string
  catalog?: string
}) {
  return (input.configured ?? input.environment ?? input.catalog ?? "https://api.swift-scale.com/v1").replace(/\/$/, "")
}
