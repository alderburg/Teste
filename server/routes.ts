import express from 'express';

const router = express.Router();

// Mock data for costs
const custosMock: any[] = [];

// API routes
router.get('/api/custos', (req, res) => {
  res.json(custosMock);
});

router.post('/api/custos', (req, res) => {
  const novoCusto = {
    id: Date.now().toString(),
    ...req.body,
    dataCriacao: new Date()
  };
  custosMock.push(novoCusto);
  res.json(novoCusto);
});

router.put('/api/custos/:id', (req, res) => {
  const { id } = req.params;
  const index = custosMock.findIndex(c => c.id === id);
  if (index !== -1) {
    custosMock[index] = { ...custosMock[index], ...req.body };
    res.json(custosMock[index]);
  } else {
    res.status(404).json({ error: 'Custo não encontrado' });
  }
});

router.delete('/api/custos/:id', (req, res) => {
  const { id } = req.params;
  const index = custosMock.findIndex(c => c.id === id);
  if (index !== -1) {
    custosMock.splice(index, 1);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Custo não encontrado' });
  }
});

export default router;