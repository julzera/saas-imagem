// client/src/App.jsx
import React, { useState, useRef, useEffect } from 'react';
import { Stage, Layer, Image as KonvaImage, Text, Transformer } from 'react-konva';
import axios from 'axios';
import './App.css';

const Icons = {
  Home: () => <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>,
  Image: () => <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>,
  Code: () => <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/></svg>,
  Settings: () => <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>,
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState('editor');

  const [file, setFile] = useState(null);
  const [imageObj, setImageObj] = useState(null);
  const [stageSize, setStageSize] = useState({ w: 800, h: 600 });
  const [scaleFactor, setScaleFactor] = useState(1);

  const [fixedText, setFixedText] = useState("Certificado para:");
  const [nameInput, setNameInput] = useState("Maria Silva");
  
  const [availableFonts, setAvailableFonts] = useState([{ name: 'sans-serif', file: null }]);
  const [fontName, setFontName] = useState('sans-serif');
  
  const [textColor, setTextColor] = useState('#E940AA');
  const [textConfig, setTextConfig] = useState({ x: 50, y: 50, rotation: 0, fontSize: 32 });
  
  const [generatedImage, setGeneratedImage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showCodeModal, setShowCodeModal] = useState(false);

  const [isSelected, setIsSelected] = useState(true);
  const shapeRef = useRef();
  const trRef = useRef();
  const containerRef = useRef(null);

  useEffect(() => { fetchFonts(); }, []);
  
  // Atualiza o transformer e força o redesenho da layer quando a fonte muda
  useEffect(() => {
    if (isSelected && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer().batchDraw();
    }
  }, [isSelected, textConfig, fontName]);

  const fetchFonts = async () => {
    try {
      const res = await axios.get('http://localhost:3001/fonts');
      setAvailableFonts(res.data);
    } catch (err) { console.error(err); }
  };

  const handleFontChange = async (e) => {
    const selectedName = e.target.value;
    const fontData = availableFonts.find(f => f.name === selectedName);

    if (fontData && fontData.file) {
        try {
            const fontUrl = `http://localhost:3001/fonts-file/${fontData.file}`;
            const newFont = new FontFace(selectedName, `url(${fontUrl})`);
            await newFont.load();
            document.fonts.add(newFont);
            
            // Pequeno delay para garantir que o browser renderizou a fonte antes do Konva medir
            setTimeout(() => {
                setFontName(selectedName);
            }, 100);
            
        } catch (err) { console.error("Erro font:", err); }
    } else {
        setFontName(selectedName);
    }
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (email && password) setIsAuthenticated(true);
    else alert("Preencha email e senha para testar.");
  };

  const fitImageToStage = (img) => {
     if (!containerRef.current) return;
     const containerWidth = containerRef.current.clientWidth;
     const containerHeight = containerRef.current.clientHeight;
     const padding = 40;
     const availableW = containerWidth - padding;
     const availableH = containerHeight - padding;
     const scaleW = availableW / img.width;
     const scaleH = availableH / img.height;
     const scale = Math.min(scaleW, scaleH, 1);
     const finalW = img.width * scale;
     const finalH = img.height * scale;
     setStageSize({ w: finalW, h: finalH });
     setScaleFactor(1 / scale);
  };

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      setFile(selected);
      setGeneratedImage(null);
      const objectUrl = URL.createObjectURL(selected);
      const img = new window.Image();
      img.src = objectUrl;
      img.onload = () => {
        setImageObj(img);
        setTimeout(() => fitImageToStage(img), 100);
      };
    }
  };

  const handleGenerate = async () => {
    if (!file) return;
    setIsLoading(true);
    const formData = new FormData();
    formData.append('image', file);
    formData.append('fixedText', fixedText);
    formData.append('variableText', nameInput);
    formData.append('x', textConfig.x * scaleFactor); 
    formData.append('y', textConfig.y * scaleFactor);
    formData.append('fontSize', textConfig.fontSize * scaleFactor);
    formData.append('rotation', textConfig.rotation);
    formData.append('color', textColor);
    formData.append('fontName', fontName);

    try {
      const response = await axios.post('http://localhost:3001/generate', formData, { responseType: 'blob' });
      setGeneratedImage(URL.createObjectURL(response.data));
    } catch (err) { 
        console.error(err);
        alert("Erro ao gerar. Veja o console do servidor."); 
    } finally { setIsLoading(false); }
  };

  if (!isAuthenticated) {
    return (
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <img src="/images/logo-vixel.png" alt="Vixel" className="logo-img" />
            <p>Entre para gerenciar seus templates</p>
          </div>
          <form onSubmit={handleLogin} className="login-form">
            <div className="input-group">
              <label>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@vixel.com" />
            </div>
            <div className="input-group">
              <label>Senha</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <button type="submit" className="btn-primary full">Acessar Painel</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
            <img src="/images/logo-vixel.png" alt="Vixel" className="sidebar-logo-img" />
        </div>
        <nav className="sidebar-nav">
          <button className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
            <Icons.Home /> Dashboard
          </button>
          <button className={`nav-item ${activeTab === 'editor' ? 'active' : ''}`} onClick={() => setActiveTab('editor')}>
            <Icons.Image /> Editor Template
          </button>
          <button className="nav-item"><Icons.Settings /> Configurações</button>
        </nav>
      </aside>

      <main className="main-content">
        <header className="top-header">
          <div className="breadcrumbs">Dashboard / <span className="current">Editor</span></div>
          <div className="header-actions">
             <button className="btn-outline" onClick={() => setShowCodeModal(true)}> <Icons.Code/> API Docs</button>
          </div>
        </header>

        <div className="content-area">
            {activeTab === 'editor' ? (
                <div className="editor-grid">
                    
                    <div className="card canvas-card-container">
                        <div className="card-header">
                            <h3>Visualização</h3>
                            <span className="badge">Preview</span>
                        </div>
                        <div className="canvas-wrapper-box" ref={containerRef}>
                            {imageObj ? (
                                <Stage 
                                    width={stageSize.w} 
                                    height={stageSize.h}
                                    onMouseDown={(e) => { 
                                        if (e.target === e.target.getStage()) setIsSelected(false); 
                                    }}
                                >
                                    <Layer>
                                        <KonvaImage image={imageObj} width={stageSize.w} height={stageSize.h} />
                                        
                                        <Text
                                            // Chave única força recriação quando a fonte muda, corrigindo o box
                                            key={`${fontName}-${textConfig.fontSize}`} 
                                            ref={shapeRef}
                                            text={`${fixedText} ${nameInput}`}
                                            x={textConfig.x} 
                                            y={textConfig.y}
                                            fontSize={textConfig.fontSize} 
                                            rotation={textConfig.rotation}
                                            fontFamily={fontName}
                                            fill={textColor}
                                            draggable
                                            width={null} // IMPORTANTE: Reseta largura para "auto"
                                            onClick={() => setIsSelected(true)}
                                            onTap={() => setIsSelected(true)}
                                            onDragEnd={(e) => setTextConfig({ ...textConfig, x: e.target.x(), y: e.target.y() })}
                                            onTransformEnd={() => {
                                                const node = shapeRef.current;
                                                const scaleX = node.scaleX();
                                                node.scaleX(1);
                                                node.scaleY(1);
                                                setTextConfig({ 
                                                    ...textConfig, 
                                                    x: node.x(), 
                                                    y: node.y(), 
                                                    rotation: node.rotation(), 
                                                    fontSize: node.fontSize() * scaleX 
                                                });
                                            }}
                                        />
                                        {isSelected && (
                                            <Transformer 
                                                ref={trRef} 
                                                rotateLineVisible={false}
                                                anchorSize={10} 
                                                anchorCornerRadius={5}
                                                borderStroke="#E940AA" 
                                                anchorStroke="#E940AA" 
                                                anchorFill="#ffffff" 
                                                centeredScaling={true}
                                                enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right']}
                                            />
                                        )}
                                    </Layer>
                                </Stage>
                            ) : (
                                <div className="empty-upload">
                                    <p>Carregue uma imagem nas configurações ao lado para começar</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="controls-column">
                        <div className="card config-card">
                            <div className="card-header"><h3>Configurações</h3></div>
                            <div className="config-body">
                                <label className="control-label">Imagem Base</label>
                                <label className="upload-btn-styled">
                                    <span>{file ? "Trocar Arquivo" : "Carregar Imagem"}</span>
                                    <input type="file" onChange={handleFileChange} accept="image/*" hidden />
                                </label>
                                <div className="divider"></div>
                                <label className="control-label">Texto Fixo</label>
                                <input type="text" value={fixedText} onChange={e => setFixedText(e.target.value)} />
                                <label className="control-label">Variável</label>
                                <input type="text" value={nameInput} onChange={e => setNameInput(e.target.value)} />
                                <div className="row-2-col">
                                    <div>
                                        <label className="control-label">Cor</label>
                                        <div className="color-picker-styled">
                                            <input type="color" value={textColor} onChange={e => setTextColor(e.target.value)} />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="control-label">Fonte</label>
                                        <select value={fontName} onChange={handleFontChange}>
                                            {availableFonts.map(f => <option key={f.name} value={f.name}>{f.name}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <label className="control-label">Tamanho ({Math.round(textConfig.fontSize)}px)</label>
                                <input 
                                    type="range" min="10" max="200" 
                                    value={textConfig.fontSize} 
                                    onChange={(e) => setTextConfig({...textConfig, fontSize: Number(e.target.value)})}
                                />
                                <button className="btn-primary mt-4" onClick={handleGenerate} disabled={!file || isLoading}>
                                    {isLoading ? "Processando..." : "Gerar Resultado"}
                                </button>
                            </div>
                        </div>
                        <div className="card">
                            <div className="card-header"><h3>Resultado Final</h3></div>
                            <div className="result-preview-box">
                                {generatedImage ? <img src={generatedImage} alt="Final" /> : <span>Aguardando geração...</span>}
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9CA3AF' }}>
                    <p>Selecione "Editor Template" no menu lateral.</p>
                </div>
            )}
        </div>
      </main>

      {showCodeModal && (
        <div className="modal-backdrop" onClick={() => setShowCodeModal(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <h3>Integração API</h3>
                <pre className="code-block">
{`{
  "imageUrl": "URL_DA_SUA_IMAGEM",
  "fixedText": "${fixedText}",
  "variableText": "{{nome}}", 
  "x": ${Math.round(textConfig.x * scaleFactor)},
  "y": ${Math.round(textConfig.y * scaleFactor)},
  "fontSize": ${Math.round(textConfig.fontSize * scaleFactor)},
  "rotation": ${Math.round(textConfig.rotation)},
  "color": "${textColor}",
  "fontName": "${fontName}"
}`}
                </pre>
                <button className="btn-primary full-width" onClick={() => setShowCodeModal(false)}>Fechar</button>
            </div>
        </div>
      )}
    </div>
  );
}

export default App;