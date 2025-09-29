# **App Name**: VTU Boss

## Core Features:

- User Authentication: Secure signup, login, email verification, and password reset functionalities for users with customer, vendor/reseller, and admin roles.
- Wallet Management: Each user gets a wallet with a unique reserved bank account, facilitating instant funding via bank transfer and automatic wallet crediting.
- Automated Service Delivery: Orchestration and task queue system for airtime, data, electricity, and other services, handling success, failure, retries, and refunds.
- Custom API Connector Tool: Allows admin users to add and manage custom API endpoints (GET/POST) with header and parameter mapping to allow access to additional service provides, response mapping, retry logic, and webhook support. Includes an LLM-powered tool to evaluate the existing system APIs, and based on those API descriptions, makes intelligent suggestions about the construction of the parameters, request formats and security needed when setting up new API definitions. Generates suggested parameters and payloads when defining an integration, and helps simplify and accelerate onboarding.
- Admin Panel: A user interface (UI) dashboard for managing services, providers, prices, commissions, users, transactions, logs, and API keys.
- Payment Gateway Integration: Pluggable architecture for integrating multiple payment gateways with sample integration for Paystack and simulated bank transfer.
- Multi-Language Support: Support for multiple languages, including English, Yoruba, and Hausa, with responsive UI and theme/color builder.

## Style Guidelines:

- Primary color: Saturated purple (#9400D3) for sophistication and trust. The image hints at a visual style dominated by purple shades, suggesting a desire for modern, clean aesthetic.
- Background color: Light purple (#F0E6FF) to create a soothing, uncluttered backdrop that doesn't distract from content.
- Accent color: Vivid orange (#FF4500) for calls to action (CTAs) and important interactive elements.
- Body and headline font: 'Inter' sans-serif for a modern and readable user interface.
- Clean and modern icon set relevant to VTU services such as airtime, data, and bill payments.
- Responsive design for accessibility across various devices with clear information hierarchy.
- Subtle transitions and animations to enhance user experience during transactions.