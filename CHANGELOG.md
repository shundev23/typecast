# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial project setup for the 4th Agentic AI Hackathon with Google Cloud
- MBTI-based movie recommendation system using Gemini 2.0 Flash
- React 19 frontend with Vite and TypeScript
- Go 1.25 backend with Echo framework
- Firebase Authentication (Google Sign-In)
- Firestore database integration
- TMDB API integration for movie metadata and streaming providers
- Emotion score calculation from mood text (-5 to +5)
- Weekly mood chart visualization with Recharts
- Recommendation history management
- Share functionality with dynamic OGP for social media
- Account deletion with 24-hour cooldown
- Feedback collection system
- Daily recommendation rate limiting
- Comprehensive Firestore security rules
- CI/CD with GitHub Actions
  - Backend deployment to Cloud Run (Tokyo)
  - Frontend deployment to Firebase Hosting
  - Docker image build and push to Artifact Registry (Osaka)

### Documentation
- English and Japanese README files
- Security guide (English and Japanese)
- Contributing guidelines (English and Japanese)
- Architecture diagrams (Mermaid exports)
- API documentation in code comments

### Infrastructure
- Cloud Run deployment configuration
- Firebase Hosting setup
- Artifact Registry in asia-northeast2 (Osaka)
- Cloud Run service in asia-northeast1 (Tokyo)
- Custom domain configuration (tycast.net)

---

## [0.1.0] - 2026-02-06

### Added
- Initial release for hackathon submission
- Core MBTI-based recommendation engine
- User authentication and profile management
- Movie recommendation with AI-generated explanations
- History tracking and duplicate prevention
- Share link generation with OGP support
- Responsive web interface with Tailwind CSS 4
- Multi-language support (English/Japanese UI elements)

### Security
- Firestore security rules implementation
- Firebase API key restrictions
- Environment variable management
- Service account authentication for backend

---

## Release Notes

### Version 0.1.0 - Hackathon Submission

This is the initial release of TYPECAST, submitted to the 4th Agentic AI Hackathon with Google Cloud. The application provides MBTI-based movie recommendations using Google's Gemini 2.0 Flash AI model.

**Key Features:**
- 16 MBTI type support with psychological function analysis
- AI-generated movie recommendations with explanations
- Emotion score tracking and weekly visualization
- Integration with TMDB for movie metadata
- Share functionality with social media OGP
- Secure authentication and data management

**Tech Stack:**
- Frontend: React 19, Vite, TypeScript, Tailwind CSS 4
- Backend: Go 1.25, Echo v4
- AI: Google Gemini API (gemini-2.0-flash)
- Database: Firebase Firestore
- Infrastructure: Google Cloud Run, Firebase Hosting

**Known Limitations:**
- Movie recommendations are limited to TMDB database
- Streaming provider information is Japan-specific
- Daily recommendation limit is configurable (default: 3-5 per day)
- OGP image generation requires server-side rendering

**Future Improvements:**
- Additional streaming provider regions
- User preference learning over time
- Social features (friend recommendations, shared lists)
- Mobile app development
- Enhanced analytics and insights

---

## Contributing

For information on how to contribute to this project, please see [CONTRIBUTING.md](./CONTRIBUTING.md).

## Security

For security-related information, please see [SECURITY.md](./SECURITY.md).
