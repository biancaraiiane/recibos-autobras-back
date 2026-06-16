import './config/env'; // Valida as variáveis antes de qualquer outra coisa
import app from './app';
import { env } from './config/env';

const port = Number(env.PORT);

app.listen(port, () => {
  console.log(`✅ Servidor rodando na porta ${port} [${env.NODE_ENV}]`);
});
