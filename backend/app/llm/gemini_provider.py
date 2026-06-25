import json
import re
from app.llm.base import GenerationResult


class GeminiSummaryProvider:
    """LLM provider using Google Gemini via the google-genai SDK.

    Uses gemini-2.5-flash model. Falls back gracefully on errors.
    """

    def __init__(self, api_key: str):
        self.api_key = api_key
        self._client = None
        self._initialized = False

    def _get_client(self):
        if self._client is None:
            from google import genai
            self._client = genai.Client(api_key=self.api_key)
        return self._client

    def is_available(self) -> bool:
        return bool(self.api_key)

    def generate(self, transcript_text: str) -> GenerationResult:
        """Generate summary, action items, and key topics using Gemini."""
        client = self._get_client()

        prompt = f"""You are an AI meeting assistant. Analyze the following meeting transcript and return a JSON response.

TRANSCRIPT:
{transcript_text[:15000]}

Return ONLY valid JSON in this exact format (no markdown, no extra text):
{{
  "summary": "A 3-5 sentence summary of the meeting",
  "action_items": ["action item 1", "action item 2", "action item 3"],
  "key_topics": ["Topic 1", "Topic 2", "Topic 3", "Topic 4"]
}}

Requirements:
- summary: 3-5 sentences covering main points, decisions, and outcomes
- action_items: 3-8 specific, actionable tasks with clear ownership where possible
- key_topics: 3-6 key discussion topics or themes"""

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
        )

        response_text = response.text.strip()

        # Strip markdown code fences if present
        if response_text.startswith("```"):
            response_text = re.sub(r"^```(?:json)?\s*", "", response_text)
            response_text = re.sub(r"\s*```$", "", response_text)

        try:
            data = json.loads(response_text)
        except json.JSONDecodeError:
            # Try to extract JSON from the response
            json_match = re.search(r"\{.*\}", response_text, re.DOTALL)
            if json_match:
                data = json.loads(json_match.group())
            else:
                raise ValueError(f"Could not parse JSON from Gemini response: {response_text[:200]}")

        return GenerationResult(
            summary_text=str(data.get("summary", "")),
            action_items=[str(a) for a in data.get("action_items", [])],
            key_topics=[str(t) for t in data.get("key_topics", [])],
        )

    def answer_question(self, transcript_text: str, question: str) -> str:
        """Answer a question about the transcript using Gemini."""
        client = self._get_client()

        prompt = f"""You are an AI meeting assistant. Answer the following question based solely on the meeting transcript provided.

TRANSCRIPT:
{transcript_text[:12000]}

QUESTION: {question}

Provide a clear, concise answer based only on what is in the transcript. If the information is not in the transcript, say so."""

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
        )

        return response.text.strip()
