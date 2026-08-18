import dotenv from 'dotenv';
import app from './app';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

app.listen(PORT, () => {
  console.log(`Server is running in ${NODE_ENV} mode on port ${PORT}`);
});
