import { createApp } from "./app";
import { loadDataset, loadIncidents, loadMeta } from "../data/loadDataset";

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

const app = createApp(loadDataset(), { meta: loadMeta(), incidents: loadIncidents() });

app.listen(PORT, () => {
  console.log(`Purr Facts listening on port ${PORT}`);
});
