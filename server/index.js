const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { registerFont, createCanvas, loadImage } = require('canvas');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

// Configurar Uploads
const upload = multer({ dest: 'uploads/' });

const fontsDir = path.join(__dirname, 'fonts');
if (!fs.existsSync(fontsDir)) fs.mkdirSync(fontsDir);

// Função para limpar nomes de fontes (remove espaços e caracteres estranhos)
function cleanFontName(filename) {
    return filename.replace(/\.(ttf|otf)$/i, '').replace(/[^a-zA-Z0-9]/g, '');
}

// Registrar fontes
function loadFonts() {
    try {
        const files = fs.readdirSync(fontsDir);
        files.forEach(file => {
            if (file.match(/\.(ttf|otf)$/i)) {
                const fontPath = path.join(fontsDir, file);
                const family = cleanFontName(file); // Nome limpo
                registerFont(fontPath, { family: family });
                console.log(`✅ Fonte registrada: "${family}" (Arquivo: ${file})`);
            }
        });
    } catch (e) {
        console.error("Erro ao carregar fontes:", e);
    }
}
loadFonts();

app.get('/fonts', (req, res) => {
    const files = fs.readdirSync(fontsDir);
    const fonts = files
        .filter(f => f.match(/\.(ttf|otf)$/i))
        .map(f => ({ 
            name: cleanFontName(f), // Manda o nome limpo pro front
            file: f 
        }));
    
    fonts.unshift({ name: 'sans-serif', file: null });
    res.json(fonts);
});

app.get('/fonts-file/:filename', (req, res) => {
    const filePath = path.join(fontsDir, req.params.filename);
    if(fs.existsSync(filePath)) res.sendFile(filePath);
    else res.status(404).send('Fonte não encontrada');
});

app.post('/upload-font', upload.single('font'), (req, res) => {
    if (!req.file) return res.status(400).send('Nenhum arquivo');
    const tempPath = req.file.path;
    const targetPath = path.join(fontsDir, req.file.originalname);
    fs.renameSync(tempPath, targetPath);
    loadFonts();
    res.json({ success: true, fontName: cleanFontName(req.file.originalname) });
});

app.post('/generate', upload.single('image'), async (req, res) => {
    console.log("--> Iniciando geração de imagem...");
    try {
        let imagePath;
        if (req.file) {
            imagePath = req.file.path;
        } else {
            console.error("Erro: Nenhuma imagem recebida");
            return res.status(400).send('No image provided');
        }

        const { fixedText, variableText, x, y, fontSize, rotation, color, fontName } = req.body;
        console.log("Dados:", { fixedText, variableText, fontSize, fontName });

        const image = await loadImage(imagePath);
        const canvas = createCanvas(image.width, image.height);
        const ctx = canvas.getContext('2d');

        ctx.drawImage(image, 0, 0);

        const fullText = `${fixedText || ''} ${variableText || ''}`;
        
        ctx.save();
        ctx.translate(parseFloat(x), parseFloat(y));
        ctx.rotate((parseFloat(rotation) * Math.PI) / 180);

        // Garante que usa o nome da fonte limpo ou sans-serif se der erro
        const safeFont = fontName || 'sans-serif';
        ctx.font = `${parseFloat(fontSize)}px "${safeFont}"`;
        ctx.fillStyle = color;
        ctx.textBaseline = 'top'; 
        ctx.fillText(fullText, 0, 0);
        ctx.restore();

        const buffer = canvas.toBuffer('image/png');
        res.type('image/png');
        res.send(buffer);

        if(req.file) fs.unlinkSync(imagePath);
        console.log("✅ Imagem gerada com sucesso!");

    } catch (error) {
        console.error("❌ Erro fatal na geração:", error);
        res.status(500).send('Erro ao gerar imagem: ' + error.message);
    }
});

app.listen(3001, () => {
    console.log('🚀 Servidor rodando na porta 3001');
});