import { createApp } from "./app";
import { loadDataset } from "../data/loadDataset";

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

const app = createApp(loadDataset());

app.listen(PORT, () => {
  console.log(`Purr Facts listening on port ${PORT}`);
});
