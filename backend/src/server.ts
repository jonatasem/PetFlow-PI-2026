import { app } from "./app";
import { env } from "./config/env";

app.listen(env.PORT, () => {
  console.log(`Servidor do petshop ativo em http://localhost:${env.PORT}`);
});
