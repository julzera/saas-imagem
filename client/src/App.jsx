// client/src/App.jsx
import React, { useState, useRef, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, Outlet } from 'react-router-dom';
import { Stage, Layer, Image as KonvaImage, Text, Transformer } from 'react-konva';
import axios from 'axios';
import './App.css';

// ATUALIZE COM SEU NGROK ATUAL
const NGROK_HOST = "https://0549-170-238-48-205.ngrok-free.app";

const Icons = {
  Home: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>,
  Image: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>,
  Settings: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"></path></svg>,
  Code: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>
};

const ProtectedRoute = () => {
  const isAuth = localStorage.getItem('vixel_auth');
  return isAuth ? <Outlet /> : <Navigate to="/login" replace />;
};

const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const handleLogin = (e) => { e.preventDefault(); if (email && password) { localStorage.setItem('vixel_auth', 'true'); navigate('/workspace'); } };
  return (
    <div className="login-container"><div className="login-card"><div className="login-header"><img src="/images/logo-vixel.png" className="logo-img" /><p>Entre para gerenciar</p></div><form onSubmit={handleLogin} className="login-form"><div className="input-group"><label>Email</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} /></div><div className="input-group"><label>Senha</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} /></div><button type="submit" className="btn-primary full">Entrar</button></form></div></div>
  );
};

const WorkspaceScreen = () => {
  const [activeTab, setActiveTab] = useState('editor');
  const [configTab, setConfigTab] = useState('upload');
  const navigate = useNavigate();

  // Canvas Global
  const [file, setFile] = useState(null);
  const [imageObj, setImageObj] = useState(null);
  const [outputSize, setOutputSize] = useState({ w: 1080, h: 1080 });
  const [stageSize, setStageSize] = useState({ w: 600, h: 600 });
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [aspectRatio, setAspectRatio] = useState('1:1');

  // CONFIGURAÇÃO DOS DOIS TEXTOS SEPARADOS
  const [fixedConfig, setFixedConfig] = useState({ text: "Certificado para:", x: 50, y: 50, fontSize: 40, fontFamily: 'sans-serif', fill: '#000000', rotation: 0 });
  const [varConfig, setVarConfig] = useState({ text: "{nome}", x: 50, y: 150, fontSize: 60, fontFamily: 'sans-serif', fill: '#E940AA', rotation: 0 });

  // Estado de Seleção ('fixed', 'var' ou null)
  const [selectedId, setSelectedId] = useState('var'); 

  const [availableFonts, setAvailableFonts] = useState([]);
  const [generatedImage, setGeneratedImage] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState(null);
  const [stats, setStats] = useState({ generated: 0, credits: 0, history: [] });

  const stageRef = useRef(null);
  const fixedRef = useRef(null);
  const varRef = useRef(null);
  const trRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => { fetchFonts(); fetchStats(); }, []);

  // Transformer Logic (Muda de alvo conforme seleção)
  useEffect(() => {
    if (selectedId && trRef.current) {
      const node = selectedId === 'fixed' ? fixedRef.current : varRef.current;
      if (node) {
        trRef.current.nodes([node]);
        trRef.current.getLayer().batchDraw();
      }
    } else if (trRef.current) {
      trRef.current.nodes([]);
    }
  }, [selectedId, fixedConfig, varConfig]);

  // Função Auxiliar: Atualiza o objeto de config correto (fixed ou var)
  const updateCurrentConfig = (key, value) => {
      if (selectedId === 'fixed') setFixedConfig(prev => ({ ...prev, [key]: value }));
      else if (selectedId === 'var') setVarConfig(prev => ({ ...prev, [key]: value }));
  };

  // Helper para pegar o valor atual nos inputs
  const getCurrentValue = (key) => {
      if (selectedId === 'fixed') return fixedConfig[key];
      if (selectedId === 'var') return varConfig[key];
      return '';
  };

  const handleLogout = () => { localStorage.removeItem('vixel_auth'); navigate('/login'); };
  const fetchFonts = async () => { try { const res = await axios.get('http://localhost:3001/fonts'); setAvailableFonts(res.data); } catch (e) { } };
  const fetchStats = async () => { try { const res = await axios.get('http://localhost:3001/dashboard-stats'); setStats(res.data); } catch (e) { } };
  const openCodeModal = (config) => { setSelectedConfig(config); setShowCodeModal(true); };

  const handleFontChange = async (e) => {
    const selected = e.target.value;
    const fontData = availableFonts.find(f => f.name === selected);
    updateCurrentConfig('fontFamily', selected);
    if (fontData?.file) {
      try {
        const font = new FontFace(selected, `url(http://localhost:3001/fonts-file/${fontData.file})`);
        await font.load();
        document.fonts.add(font);
      } catch (err) { }
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFile(file);
      const img = new window.Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => { setImageObj(img); fitImageInStage(aspectRatio); };
    }
  };

  const fitImageInStage = (ratio) => {
    if (!containerRef.current) return;
    const containerW = containerRef.current.clientWidth;
    const containerH = containerRef.current.clientHeight;
    let visW = 500, visH = 500, realW = 1080, realH = 1080;
    if (ratio === '1:1') { visW = 500; visH = 500; realW = 1080; realH = 1080; }
    if (ratio === '4:5') { visW = 400; visH = 500; realW = 1080; realH = 1350; }
    if (ratio === '9:16') { visW = 281; visH = 500; realW = 1080; realH = 1920; }
    setStageSize({ w: visW, h: visH });
    setOutputSize({ w: realW, h: realH });
    setPosition({ x: (containerW - visW) / 2, y: (containerH - visH) / 2 });
    setScale(1);
  };

  const changeAspectRatio = (ratio) => { setAspectRatio(ratio); fitImageInStage(ratio); };

  const handleGenerate = async () => {
    if (!file && configTab === 'upload') return;
    setIsLoading(true); setGeneratedImage(null);

    const factor = outputSize.w / stageSize.w;
    let imgScaleInPreview = 1;
    if (imageObj) {
      const ratioW = stageSize.w / imageObj.width;
      const ratioH = stageSize.h / imageObj.height;
      imgScaleInPreview = Math.min(ratioW, ratioH);
    }

    // PREPARA CONFIGURAÇÃO COMPLETA PARA OS DOIS TEXTOS
    const currentConfig = {
        finalWidth: outputSize.w, finalHeight: outputSize.h,
        imgScale: imgScaleInPreview * factor,
        
        // Dados do Texto Fixo
        fixedText: fixedConfig.text,
        fixed_x: fixedConfig.x * factor,
        fixed_y: fixedConfig.y * factor,
        fixed_fontSize: fixedConfig.fontSize * factor,
        fixed_rotation: fixedConfig.rotation,
        fixed_color: fixedConfig.fill,
        fixed_fontName: fixedConfig.fontFamily,

        // Dados do Texto Variável
        variableText: varConfig.text,
        var_x: varConfig.x * factor,
        var_y: varConfig.y * factor,
        var_fontSize: varConfig.fontSize * factor,
        var_rotation: varConfig.rotation,
        var_color: varConfig.fill,
        var_fontName: varConfig.fontFamily,
    };

    const formData = new FormData();
    formData.append('image', file);
    Object.keys(currentConfig).forEach(key => formData.append(key, currentConfig[key]));

    try {
      const res = await axios.post('http://localhost:3001/generate', formData, { responseType: 'blob' });
      setGeneratedImage(URL.createObjectURL(res.data));
      // Pega o nome real salvo no servidor
      const templateName = res.headers['x-template-name'] || 'template_unknown.png';
      setSelectedConfig({...currentConfig, templateName});
      fetchStats();
    } catch (err) { alert("Erro ao gerar. Tente novamente."); console.error(err); }
    finally { setIsLoading(false); }
  };

  // Funções de Transformação para cada texto
  const handleTransformEnd = (node, isFixed) => {
      const scaleX = node.scaleX();
      node.scaleX(1); node.scaleY(1);
      const newProps = {
          x: node.x(),
          y: node.y(),
          rotation: node.rotation(),
          fontSize: Math.round(node.fontSize() * scaleX)
      };
      if (isFixed) setFixedConfig(prev => ({...prev, ...newProps}));
      else setVarConfig(prev => ({...prev, ...newProps}));
  };

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <img src="/images/logo-vixel.png" className="sidebar-logo-img" />
        <nav className="sidebar-nav">
          <button className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}><Icons.Home /> Dashboard</button>
          <button className={`nav-item ${activeTab === 'editor' ? 'active' : ''}`} onClick={() => setActiveTab('editor')}><Icons.Image /> Editor</button>
          <button className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}><Icons.Settings /> Configurações</button>
        </nav>
        <div style={{ marginTop: 'auto' }}><button onClick={handleLogout} className="nav-item" style={{ color: '#E940AA' }}>Sair</button></div>
      </aside>

      <main className="main-content">
        <header className="top-header">
          <div className="breadcrumbs">App / <span className="current">{activeTab.toUpperCase()}</span></div>
          <div style={{ display: 'flex', gap: 15, alignItems: 'center' }}>
            <button className="btn-outline" onClick={() => setShowCodeModal(true)}> <Icons.Code /> API</button>
          </div>
        </header>

        <div className="content-area">
          {activeTab === 'dashboard' && (
            <div style={{ width: '100%' }}>
              <div className="stats-grid">
                <div className="stat-card"><h3>Geradas</h3><span className="stat-number">{stats.generated}</span></div>
                <div className="stat-card"><h3>Créditos</h3><span className="stat-number">{stats.credits}</span></div>
                <div className="stat-card"><h3>Plano</h3><span className="stat-number" style={{ color: '#6B7280' }}>PRO</span></div>
              </div>
              <div className="card" style={{ padding: 24 }}>
                <h3>Histórico Recente</h3>
                <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(150px, 1fr))', gap:20, marginTop:20}}>
                    {stats.history.map((item) => (
                        <div key={item.id} style={{border:'1px solid #eee', borderRadius:10, padding:10, background:'#fff'}}>
                            <img src={item.previewUrl} alt="History" style={{width:'100%', height:150, objectFit:'contain', borderRadius:5}} />
                            <button className="btn-outline" style={{width:'100%', marginTop:10, justifyContent:'center'}} onClick={() => openCodeModal(item.config)}>
                                <Icons.Code/> Código
                            </button>
                        </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="card" style={{ padding: 30, maxWidth: 600, margin: '0 auto' }}>
              <h3>Minha Conta</h3>
              <div className="config-body">
                <label>Nome</label><input type="text" value="Admin User" readOnly />
                <label>Token Ngrok</label><input type="text" value={NGROK_HOST} readOnly style={{ fontFamily: 'monospace' }} />
                <button className="btn-primary">Salvar Alterações</button>
              </div>
            </div>
          )}

          {activeTab === 'editor' && (
            <div className="editor-grid">
              <div className="card">
                <div className="card-header">
                  <h3>Editor</h3>
                  <div className="aspect-ratios">
                    <button className={`aspect-btn ${aspectRatio === '1:1' ? 'active' : ''}`} onClick={() => changeAspectRatio('1:1')}>1:1</button>
                    <button className={`aspect-btn ${aspectRatio === '4:5' ? 'active' : ''}`} onClick={() => changeAspectRatio('4:5')}>4:5</button>
                    <button className={`aspect-btn ${aspectRatio === '9:16' ? 'active' : ''}`} onClick={() => changeAspectRatio('9:16')}>9:16</button>
                  </div>
                </div>
                <div className="canvas-wrapper-box" ref={containerRef}>
                  <Stage ref={stageRef} width={containerRef.current?.clientWidth || 800} height={containerRef.current?.clientHeight || 600} scaleX={scale} scaleY={scale} x={position.x} y={position.y} 
                    onMouseDown={(e) => { if (e.target === e.target.getStage()) setSelectedId(null); }}
                  >
                    <Layer>
                      <KonvaImage x={0} y={0} width={stageSize.w} height={stageSize.h} fill="white" listening={false} />
                      {imageObj && ( <KonvaImage image={imageObj} x={(stageSize.w - (imageObj.width * Math.min(stageSize.w / imageObj.width, stageSize.h / imageObj.height))) / 2} y={(stageSize.h - (imageObj.height * Math.min(stageSize.w / imageObj.width, stageSize.h / imageObj.height))) / 2} width={imageObj.width * Math.min(stageSize.w / imageObj.width, stageSize.h / imageObj.height)} height={imageObj.height * Math.min(stageSize.w / imageObj.width, stageSize.h / imageObj.height)} listening={false} /> )}
                      
                      {/* TEXTO FIXO */}
                      <Text
                        key={`fixed-${fixedConfig.fontFamily}`}
                        ref={fixedRef}
                        {...fixedConfig}
                        draggable
                        onClick={() => setSelectedId('fixed')}
                        onTap={() => setSelectedId('fixed')}
                        onDragEnd={(e) => setFixedConfig({...fixedConfig, x: e.target.x(), y: e.target.y()})}
                        onTransformEnd={() => handleTransformEnd(fixedRef.current, true)}
                      />

                      {/* TEXTO VARIÁVEL (Dinâmico) */}
                      <Text
                        key={`var-${varConfig.fontFamily}`}
                        ref={varRef}
                        {...varConfig}
                        draggable
                        onClick={() => setSelectedId('var')}
                        onTap={() => setSelectedId('var')}
                        onDragEnd={(e) => setVarConfig({...varConfig, x: e.target.x(), y: e.target.y()})}
                        onTransformEnd={() => handleTransformEnd(varRef.current, false)}
                      />

                      <Transformer ref={trRef} rotateLineVisible={false} anchorSize={12} anchorCornerRadius={6} borderStroke="#E940AA" anchorStroke="#E940AA" anchorFill="#FFFFFF" rotateAnchorOffset={40} padding={5} />
                    </Layer>
                  </Stage>
                </div>
              </div>

              <div className="controls-column">
                <div className="card">
                  <div className="config-tabs">
                      <button className={`tab-btn ${configTab === 'upload' ? 'active' : ''}`} onClick={() => setConfigTab('upload')}>Upload</button>
                      <button className={`tab-btn ${configTab === 'ai' ? 'active' : ''}`} onClick={() => setConfigTab('ai')}>AI</button>
                  </div>

                  <div className="config-body">
                    {configTab === 'upload' ? (
                        <label className="upload-btn-styled"><span>{file ? "Trocar Imagem" : "Carregar Imagem"}</span><input type="file" onChange={handleFileChange} accept="image/*" hidden /></label>
                    ) : (
                        <textarea rows="3" placeholder="Gerar com AI (Em breve)" />
                    )}

                    {/* CONTROLES CONDICIONAIS */}
                    <div className="divider"></div>
                    <p style={{fontSize:11, fontWeight:'bold', color:'#E940AA', marginBottom:5}}>EDITANDO: {selectedId === 'fixed' ? 'TEXTO FIXO' : selectedId === 'var' ? 'TEXTO DINÂMICO' : 'SELECIONE UM TEXTO'}</p>
                    
                    <label>Conteúdo</label> 
                    <input type="text" 
                        value={getCurrentValue('text')} 
                        onChange={e => updateCurrentConfig('text', e.target.value)} 
                        disabled={!selectedId}
                    />

                    <div className="row-2-col">
                      <div><label>Cor</label><div className="color-picker-styled"><input type="color" value={getCurrentValue('fill')} onChange={e => updateCurrentConfig('fill', e.target.value)} disabled={!selectedId} style={{ opacity: 1, padding: 0, height: 30 }} /></div></div>
                      <div><label>Fonte</label><select value={getCurrentValue('fontFamily')} onChange={handleFontChange} disabled={!selectedId}>{availableFonts.map(f => <option key={f.name} value={f.name}>{f.name}</option>)}</select></div>
                    </div>
                    
                    <label>Tamanho</label>
                    <input type="range" min="10" max="200" value={getCurrentValue('fontSize') || 30} onChange={e => updateCurrentConfig('fontSize', Number(e.target.value))} disabled={!selectedId} />

                    <button className="btn-primary mt-4" onClick={handleGenerate} disabled={!imageObj || isLoading}>
                      {isLoading ? "Gerando..." : "Gerar Resultado"}
                    </button>
                  </div>
                </div>

                {generatedImage && (
                  <div className="card" style={{ marginTop: 20 }}>
                    <div className="card-header"><h3>Resultado</h3></div>
                    <div className="result-preview-box" onClick={() => setShowImageModal(true)} style={{ cursor: 'zoom-in' }}>
                      <img src={generatedImage} alt="Final" style={{ maxWidth: '100%', maxHeight: 200, objectFit: 'contain' }} />
                    </div>
                    <div style={{padding:16, display:'flex', gap:10}}>
                        <button className="btn-outline" style={{flex:1}} onClick={() => openCodeModal(selectedConfig)}> <Icons.Code/> Código</button>
                        <button className="btn-primary" style={{flex:1, fontSize:12}} onClick={()=>window.open(generatedImage, '_blank')}>Baixar</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Modais */}
      {showImageModal && ( <div className="modal-backdrop" onClick={() => setShowImageModal(false)}><div style={{ position: 'relative', maxWidth: '90%', maxHeight: '90%' }}><img src={generatedImage} style={{ maxWidth: '100%', maxHeight: '90vh', borderRadius: 8 }} /></div></div> )}

      {showCodeModal && selectedConfig && (
        <div className="modal-backdrop" onClick={() => setShowCodeModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>Integração Typebot</h3>
            <pre className="code-block">
{`{
  "templateName": "${selectedConfig.templateName}",
  "fixedText": "${selectedConfig.fixedText}",
  "variableText": "{{nome}}", 
  
  "finalWidth": ${selectedConfig.finalWidth},
  "finalHeight": ${selectedConfig.finalHeight},
  "imgScale": ${selectedConfig.imgScale},

  "fixed_x": ${Math.round(selectedConfig.fixed_x)},
  "fixed_y": ${Math.round(selectedConfig.fixed_y)},
  "fixed_fontSize": ${Math.round(selectedConfig.fixed_fontSize)},
  "fixed_fontName": "${selectedConfig.fixed_fontName}",
  "fixed_color": "${selectedConfig.fixed_color}",
  "fixed_rotation": ${Math.round(selectedConfig.fixed_rotation)},

  "var_x": ${Math.round(selectedConfig.var_x)},
  "var_y": ${Math.round(selectedConfig.var_y)},
  "var_fontSize": ${Math.round(selectedConfig.var_fontSize)},
  "var_fontName": "${selectedConfig.var_fontName}",
  "var_color": "${selectedConfig.var_color}",
  "var_rotation": ${Math.round(selectedConfig.var_rotation)},

  "responseFormat": "json"
}`}
            </pre>
            <div style={{background:'#F3E8F0', padding:10, borderRadius:8, fontSize:12, color:'#E940AA', marginBottom:20}}>
                <strong>URL do Webhook:</strong> {NGROK_HOST}/generate
            </div>
            <button className="btn-primary full-width" onClick={() => setShowCodeModal(false)}>Fechar</button>
          </div>
        </div>
      )}
    </div>
  );
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginScreen />} />
        <Route path="/" element={<Navigate to="/workspace" replace />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/workspace" element={<WorkspaceScreen />} />
        </Route>
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;