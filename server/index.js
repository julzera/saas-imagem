const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { registerFont, createCanvas, loadImage } = require('canvas');
const path = require('path');
const fs = require('fs');

const app = express();

// Configurações de limite para imagens grandes
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// CORS liberado
app.use(cors({ exposedHeaders: ['x-template-name'] }));

// Servir a pasta de uploads publicamente (CRUCIAL para o Typebot ver a imagem)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Garantir pastas
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const fontsDir = path.join(__dirname, 'fonts');
if (!fs.existsSync(fontsDir)) fs.mkdirSync(fontsDir, { recursive: true });

const upload = multer({ dest: path.join(__dirname, 'uploads/') });

// --- FUNÇÕES ---
function cleanFontName(filename) {
    return filename.replace(/\.(ttf|otf)$/i, '').replace(/[^a-zA-Z0-9]/g, '');
}

function loadFonts() {
    try {
        const files = fs.readdirSync(fontsDir);
        files.forEach(file => {
            if (file.match(/\.(ttf|otf)$/i)) {
                registerFont(path.join(fontsDir, file), { family: cleanFontName(file) });
            }
        });
    } catch (e) { console.error("Erro fontes:", e); }
}
loadFonts();

// --- ROTAS ---
app.get('/fonts', (req, res) => {
    try {
        const files = fs.readdirSync(fontsDir);
        const fonts = files.filter(f => f.match(/\.(ttf|otf)$/i)).map(f => ({ name: cleanFontName(f), file: f }));
        fonts.unshift({ name: 'sans-serif', file: null });
        res.json(fonts);
    } catch (e) { res.json([{ name: 'sans-serif', file: null }]); }
});

app.get('/fonts-file/:filename', (req, res) => {
    const filePath = path.join(fontsDir, req.params.filename);
    if(fs.existsSync(filePath)) res.sendFile(filePath); else res.status(404).send('Fonte não encontrada');
});

// --- ROTA GERAÇÃO (HÍBRIDA: UPLOAD OU TYPEBOT) ---
app.post('/generate', upload.single('image'), async (req, res) => {
    try {
        let imageBuffer;
        let templateName = null;

        // 1. Identificar a Imagem (Upload ou Reuso)
        if (req.file) {
            // Veio do Editor (Upload)
            templateName = `template_${Date.now()}.png`;
            const permanentPath = path.join(uploadsDir, templateName);
            
            // Lê do temp e salva permanente
            imageBuffer = fs.readFileSync(req.file.path);
            fs.writeFileSync(permanentPath, imageBuffer);
            
            // Limpa temp
            try { fs.unlinkSync(req.file.path); } catch(e){}
            
            // Avisa o front o nome do arquivo para salvar no JSON
            res.setHeader('x-template-name', templateName);

        } else if (req.body.templateName) {
            // Veio do Typebot (JSON)
            templateName = req.body.templateName;
            const templatePath = path.join(uploadsDir, templateName);
            
            if (!fs.existsSync(templatePath)) {
                console.error("Template não encontrado:", templatePath);
                return res.status(404).json({ error: "Template não encontrado. Faça o upload novamente no editor." });
            }
            imageBuffer = fs.readFileSync(templatePath);
        } else {
            return res.status(400).send('Nenhuma imagem ou template fornecido.');
        }

        // 2. Parâmetros
        const { 
            fixedText, variableText, 
            x, y, fontSize, rotation, color, fontName,
            finalWidth, finalHeight 
        } = req.body;

        // 3. Desenhar
        const image = await loadImage(imageBuffer);
        
        // Usa tamanho definido ou original
        const width = finalWidth ? parseInt(finalWidth) : image.width;
        const height = finalHeight ? parseInt(finalHeight) : image.height;

        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext('2d');

        // Fundo Branco (previne transparência preta no whats)
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);

        // Desenha imagem (esticada para caber, se necessário, ou normal)
        ctx.drawImage(image, 0, 0, width, height);

        const fullText = `${fixedText || ''} ${variableText || ''}`;
        
        if (fullText.trim()) {
            ctx.save();
            ctx.translate(parseFloat(x || 0), parseFloat(y || 0));
            ctx.rotate((parseFloat(rotation || 0) * Math.PI) / 180);

            const safeFont = fontName || 'sans-serif';
            try {
                ctx.font = `${parseFloat(fontSize || 30)}px "${safeFont}"`;
            } catch { ctx.font = `${parseFloat(fontSize || 30)}px sans-serif`; }
            
            ctx.fillStyle = color || '#000000';
            ctx.textBaseline = 'top'; 
            ctx.fillText(fullText, 0, 0);
            ctx.restore();
        }

        // 4. Salvar Resultado
        const buffer = canvas.toBuffer('image/png');
        const fileName = `result_${Date.now()}.png`;
        const resultPath = path.join(uploadsDir, fileName);
        fs.writeFileSync(resultPath, buffer);

        // URL HTTPS para o Typebot
        // IMPORTANTE: Aqui definimos o domínio fixo da API
        const fullUrl = `https://api.limonixdigital.com/uploads/${fileName}`;

        // 5. Retorno
        if (req.body.responseFormat === 'json' || req.body.templateName) {
            // Typebot espera JSON
            res.json({ url: fullUrl });
        } else {
            // Editor espera blob
            res.type('image/png');
            res.send(buffer);
        }

    } catch (error) {
        console.error("Erro:", error);
        res.status(500).send('Erro interno: ' + error.message);
    }
});

app.listen(3001, () => console.log('🚀 Server ON na porta 3001'));