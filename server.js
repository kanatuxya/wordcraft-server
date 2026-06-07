// server.js — минимальный бэкенд "мозга" (подход Б)
// Запуск:  npm i express cors @anthropic-ai/sdk
//          ANTHROPIC_API_KEY=sk-... node server.js
//
// Ключ ХРАНИТСЯ ТОЛЬКО ЗДЕСЬ, на сервере. Никогда не клади его во фронтенд.

import express from "express";
import cors from "cors";
import Anthropic from "@anthropic-ai/sdk";

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" })); // ограничь размер текста

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `Ты помощник для изучения английского.
На вход — английский текст и желаемый уровень (A1..C2 или "auto").
Задачи:
1. Если уровень "auto" — оцени уровень читателя по тексту (A1..C2).
2. Выбери 15-25 ПОЛЕЗНЫХ для изучения слов: на уровне читателя и чуть выше.
   Пропусти элементарные слова и служебные (the, is, and...).
   Приведи каждое слово к словарной форме (леммы).
3. Для каждого слова верни перевод на русский и казахский в том значении,
   в котором слово употреблено в тексте, транскрипцию IPA, часть речи и
   РОВНО 3 примера предложения разной сложности.

Верни ТОЛЬКО валидный JSON, без markdown и пояснений, в формате:
{
  "level": "B1",
  "cards": [
    {
      "word": "resilient",
      "ipa": "/rɪˈzɪliənt/",
      "pos": "adjective",
      "ru": "устойчивый, жизнестойкий",
      "kk": "төзімді, мықты",
      "examples": ["...", "...", "..."]
    }
  ]
}`;

app.post("/api/generate-cards", async (req, res) => {
  try {
    const { text, level = "auto" } = req.body;
    if (!text || text.length > 20000) {
      return res.status(400).json({ error: "Текст пустой или слишком большой" });
    }

    const msg = await client.messages.create({
      model: "claude-sonnet-4-6", // проверь актуальное имя модели в доках
      max_tokens: 4000,
      system: SYSTEM_PROMPT,
      messages: [
        { role: "user", content: `Уровень: ${level}\n\nТекст:\n${text}` },
      ],
    });

    const raw = msg.content.find((b) => b.type === "text")?.text ?? "{}";
    // на всякий случай срезаем возможные ```json ... ```
    const clean = raw.replace(/```json|```/g, "").trim();
    const data = JSON.parse(clean);

    // фронт ждёт массив карточек
    res.json({ level: data.level ?? "—", cards: data.cards ?? [] });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Не удалось сгенерировать карточки" });
  }
});

app.listen(3001, () => console.log("API на http://localhost:3001"));