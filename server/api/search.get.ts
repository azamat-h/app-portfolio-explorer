import { defineEventHandler, getQuery } from "h3";

import fs from "fs";
import Papa from "papaparse";
import cosineSimilarity from "cosine-similarity";
import { pipeline } from "@xenova/transformers";

type Item = {
  id: string;
  name: string;
  description: string;
  tags: string[];
};

export default defineEventHandler(async (event) => {
  const q = getQuery(event).q as string | undefined;
  const query = (q || "").toString().trim().toLowerCase();

  // Simulate thinking/processing time
  // await new Promise((resolve) => setTimeout(resolve, 3000));

  if (!query) {
    return { results: [] as Item[] };
  }

  // -------------------
  // L2 нормализация
  function normalize(vec: number[]) {
    const norm = Math.sqrt(vec.reduce((sum, x) => sum + x * x, 0));
    return vec.map((x) => x / norm);
  }

  // -------------------
  // Mean pooling
  function meanPooling(output: any) {
    const [batch, seq_len, hidden] = output.dims;
    const values = Array.from(output.data);

    const vectors: number[][] = [];
    for (let i = 0; i < seq_len; i++) {
      vectors.push(values.slice(i * hidden, (i + 1) * hidden));
    }

    const pooled = vectors[0].map(
      (_, j) => vectors.reduce((sum, v) => sum + v[j], 0) / seq_len
    );

    return normalize(pooled);
  }

  // -------------------
  // Глобальные переменные
  let embedder: any;
  let apps: any[] = [];
  let appEmbeddings: number[][] = [];

  // Загружаем embedder
  // Загружаем embedder онлайн
  async function getEmbedder() {
    if (!embedder) {
      embedder = await pipeline(
        "feature-extraction",
        "Xenova/multi-qa-mpnet-base-dot-v1"
      );
    }
    return embedder;
  }

  // Загружаем CSV
  function loadCSV() {
    const file = fs.readFileSync("./server/api/apps.csv", "utf8");
    const parsed = Papa.parse(file, { header: true });
    apps = parsed.data.filter((x: any) => x.id);
  }

  // Строим embeddings для приложений
  async function buildAppEmbeddings() {
    const model = await getEmbedder();
    appEmbeddings = await Promise.all(
      apps.map(async (app) => {
        const embedding_text =
          app.name +
          " " +
          app.description +
          " " +
          app.category +
          " " +
          app.tags;
        const output = await model(embedding_text);
        return meanPooling(output);
      })
    );
  }

  // При старте
  loadCSV();
  await buildAppEmbeddings();

  // --- сам эндпоинт ---
  const searcher = async (q: string) => {
    if (!q) return { error: "No query provided" };

    const model = await getEmbedder();
    const qVec = meanPooling(await model(q));

    // Считаем похожесть
    const scored = apps.map((app, i) => ({
      ...app,
      score: cosineSimilarity(qVec, appEmbeddings[i]),
    }));

    // Сортируем по убыванию
    scored.sort((a, b) => b.score - a.score);

    return { results: scored.slice(0, 9) }; // топ-3 результата
  };

  const results = await searcher(query);

  return results;
});
