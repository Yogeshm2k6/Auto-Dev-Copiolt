
       // =============================================
       // ERROR DEMO PROJECT - AutoDev Copilot Test
       // This file has 8 intentional bugs for testing
       // =============================================

       const express = require('express');
       const axios = require('axios');
       const cors = require('cors');

       const app = express();
       app.use(cors());
       app.use(express.json());

       // Define port
       const PORT = process.env.SERVE_PORT || 3000;

       // ---- API ERROR DEMOS ----

       // Route 1: 404 Not Found API Error
       app.get('/api/users/:id', async (req, res) => {
           // Fix: use correct param name
           const userId = req.params.id;
           try {
               const response = await axios.get(`https://jsonplaceholder.typicode.com/users/${userId}`);
               res.json(response.data);
           } catch (error) {
               res.status(404).json({ error: 'User not found' });
           }
       });

       // Route 2: Timeout API Error
       app.get('/api/slow', async (req, res) => {
           try {
               // Fix: increase timeout
               const response = await axios.get('https://httpbin.org/delay/10', { timeout: 10000 });
               res.json(response.data);
           } catch (error) {
               // Fix: access correct property
               res.status(500).json({ error: error.message });
           }
       });

       // Route 3: Invalid URL API Error
       app.get('/api/broken-url', async (req, res) => {
           try {
               const response = await axios.get('https://jsonplaceholder.typicode.com/users');
               res.json(response.data);
           } catch (error) {
               res.status(502).json({ error: 'Upstream API failed', details: error.message });
           }
       });

       // Route 4: 401 Unauthorized API Error
       app.get('/api/protected', async (req, res) => {
           try {
               // Fix: provide auth token
               const response = await axios.get('https://httpbin.org/bearer', {
                   headers: {
                       Authorization: 'Bearer YOUR_TOKEN'
                   }
               });
               res.json(response.data);
           } catch (error) {
               res.status(error.response?.status || 500).json({
                   error: 'Authentication failed',
                   status: error.response?.status
               });
           }
       });

       // Route 5: POST with bad data
       app.post('/api/data', (req, res) => {
           const { name, email } = req.body;
           // Fix: define validateAndSave function
           function validateAndSave(name, email) {
               // Add validation logic here
               if (!name || !email) {
                   throw new Error('Name and email are required');
               }
               return { name, email };
           }
           try {
               const result = validateAndSave(name, email);
               res.json({ saved: true, result });
           } catch (error) {
               res.status(400).json({ error: error.message });
           }
       });

       // Route 6: Unhandled promise rejection
       app.get('/api/crash', async (req, res) => {
           try {
               const data = await axios.get('https://jsonplaceholder.typicode.com/posts/1');
               // Fix: add null check
               if (data.data) {
                   const title = data.data.title;
                   res.json({ title });
               } else {
                   res.status(404).json({ error: 'Data not found' });
               }
           } catch (error) {
               res.status(500).json({ error: error.message });
           }
       });

       app.listen(PORT, () => {
           console.log(`Server running on http://localhost:${PORT}`);
       });
   