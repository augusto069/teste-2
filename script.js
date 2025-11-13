// Estado e utilitários
let ambienteIndex = 0;
let resumo = [];

document.getElementById('dataOrcamento').valueAsDate = new Date();

function adicionarAmbiente(){
  ambienteIndex++;
  const id = ambienteIndex;
  const container = document.createElement('div');
  container.className = 'ambiente';
  container.id = `amb${id}`;
  container.innerHTML = `
    <div class="amb-header">
      <strong>Ambiente — #${id}</strong>
      <div style="display:flex;gap:8px">
        <button class="ghost" onclick="duplicarAmbiente(${id})">Duplicar</button>
        <button class="ghost" onclick="removerAmbiente(${id})">Remover</button>
      </div>
    </div>

    <div style="margin-top:8px" class="grid">
      <div>
        <label>Nome do ambiente</label>
        <input type="text" id="nome${id}" placeholder="Ex: Sala, Cozinha">
      </div>
      <div>
        <label>Comprimento (m)</label>
        <input type="number" id="comp${id}" step="0.01" min="0">
      </div>
      <div>
        <label>Largura (m)</label>
        <input type="number" id="larg${id}" step="0.01" min="0">
      </div>
    </div>

    <div class="grid" style="margin-top:10px">
      <div>
        <label>Valor mão de obra por m² (Piso) — R$</label>
        <input type="number" id="valorPiso${id}" step="0.01" min="0">
      </div>
      <div style="align-self:end">
        <label style="visibility:hidden">placeholder</label>
        <label><input type="checkbox" id="incluirAz${id}" onchange="toggleAzulejo(${id})"> Incluir Azulejo</label>
      </div>
      <div id="azOptions${id}" style="display:none">
        <label>Altura do azulejo (m)</label>
        <input type="number" id="altAz${id}" step="0.01" min="0" placeholder="Ex: 1.20">
        <label>Valor mão de obra por m² (Azulejo) — R$</label>
        <input type="number" id="valorAz${id}" step="0.01" min="0">
      </div>
    </div>

    <div style="margin-top:12px">
      <h4 style="margin:0 0 8px 0">Portas / Janelas (áreas descontadas)</h4>
      <div id="aberturas${id}"></div>
      <div style="display:flex;gap:8px;margin-top:8px">
        <button class="ghost" onclick="adicionarAbertura(${id})">+ Adicionar Abertura</button>
      </div>
    </div>
  `;
  document.getElementById('ambientesContainer').appendChild(container);

  // atualizar preview em tempo real
  container.addEventListener('input', atualizarPreviewDebounced);
}

function duplicarAmbiente(id){
  const nome = document.getElementById(`nome${id}`).value;
  const comp = document.getElementById(`comp${id}`).value;
  const larg = document.getElementById(`larg${id}`).value;
  const valorPiso = document.getElementById(`valorPiso${id}`).value;
  const incluirAz = document.getElementById(`incluirAz${id}`)?.checked;
  const altAz = document.getElementById(`altAz${id}`)?.value;
  const valorAz = document.getElementById(`valorAz${id}`)?.value;
  adicionarAmbiente();
  const newId = ambienteIndex;
  document.getElementById(`nome${newId}`).value = nome;
  document.getElementById(`comp${newId}`).value = comp;
  document.getElementById(`larg${newId}`).value = larg;
  document.getElementById(`valorPiso${newId}`).value = valorPiso;
  if(incluirAz){
    document.getElementById(`incluirAz${newId}`).checked = true;
    toggleAzulejo(newId);
    document.getElementById(`altAz${newId}`).value = altAz;
    document.getElementById(`valorAz${newId}`).value = valorAz;
  }
  atualizarPreviewDebounced();
}

function removerAmbiente(id){
  const el = document.getElementById(`amb${id}`);
  if(el) el.remove();
  atualizarPreviewDebounced();
}

function limparAmbientes(){
  document.getElementById('ambientesContainer').innerHTML = '';
  resumo = [];
  atualizarPreviewDebounced();
}

function toggleAzulejo(id){
  const show = document.getElementById(`incluirAz${id}`).checked;
  document.getElementById(`azOptions${id}`).style.display = show ? 'block' : 'none';
  atualizarPreviewDebounced();
}

function adicionarAbertura(id){
  const cont = document.getElementById(`aberturas${id}`);
  const idx = Date.now();
  const row = document.createElement('div');
  row.className = 'grid';
  row.style.marginTop = '8px';
  row.id = `ab${id}_${idx}`;
  row.innerHTML = `
    <div>
      <label>Tipo</label>
      <select id="tipo${id}_${idx}">
        <option value="porta">Porta</option>
        <option value="janela">Janela</option>
        <option value="outra">Outra</option>
      </select>
    </div>
    <div>
      <label>Largura (m)</label>
      <input type="number" id="abLarg${id}_${idx}" step="0.01" min="0">
    </div>
    <div>
      <label>Altura (m)</label>
      <input type="number" id="abAlt${id}_${idx}" step="0.01" min="0">
    </div>
    <div style="display:flex;align-items:end;gap:6px">
      <button class="ghost" onclick="removerAbertura('${id}','${idx}')">Remover</button>
    </div>
  `;
  cont.appendChild(row);
  atualizarPreviewDebounced();
}

function removerAbertura(id, idx){
  const el = document.getElementById(`ab${id}_${idx}`);
  if(el) el.remove();
  atualizarPreviewDebounced();
}

// cálculo técnico por ambiente --- MARGEM APLICADA SOMENTE ÀS METRAGENS DE MATERIAL
function calcularResumoAmbientes(){
  resumo = [];
  const containers = document.querySelectorAll('.ambiente');
  let totalPiso = 0, totalAzulejo = 0, totalDescontos = 0, totalValor = 0;
  const margem = parseFloat(document.getElementById('margem')?.value) || 0;
  containers.forEach((node, i) => {
    const id = node.id.replace('amb','');
    const nome = (document.getElementById(`nome${id}`)?.value || `Ambiente ${id}`).trim();
    const comp = parseFloat(document.getElementById(`comp${id}`)?.value) || 0;
    const larg = parseFloat(document.getElementById(`larg${id}`)?.value) || 0;
    const areaPiso = comp * larg;

    // coletar aberturas desse ambiente
    let desconto = 0;
    const abContainer = document.getElementById(`aberturas${id}`);
    if(abContainer){
      const rows = abContainer.querySelectorAll('[id^="ab' + id + '_"]');
      rows.forEach(r => {
        const idx = r.id.split('_')[1];
        const lw = parseFloat(document.getElementById(`abLarg${id}_${idx}`)?.value) || 0;
        const lh = parseFloat(document.getElementById(`abAlt${id}_${idx}`)?.value) || 0;
        desconto += lw * lh;
      });
    }

    const areaLiquida = Math.max(0, areaPiso - desconto);

    // piso subtotal (mão de obra) -- NÃO sofre margem
    const valorPiso = parseFloat(document.getElementById(`valorPiso${id}`)?.value) || 0;
    const subtotalPiso = areaLiquida * valorPiso;

    // azulejo (opcional): calculado pelo perímetro * altura (m) -- mão de obra também NÃO sofre margem
    let areaAzulejo = 0;
    let subtotalAzulejo = 0;
    let valorAz = 0;
    if(document.getElementById(`incluirAz${id}`)?.checked){
      const altAz = parseFloat(document.getElementById(`altAz${id}`)?.value) || 0;
      valorAz = parseFloat(document.getElementById(`valorAz${id}`)?.value) || 0;
      const perimetro = 2 * (comp + larg);
      areaAzulejo = perimetro * altAz;
      subtotalAzulejo = areaAzulejo * valorAz;
    }

    const subtotal = subtotalPiso + subtotalAzulejo;

    // materiais com margem aplicada (apenas quantidades)
    const materialPisoComMargem = areaLiquida * (1 + margem / 100);
    const materialAzulejoComMargem = areaAzulejo * (1 + margem / 100);

    resumo.push({
      id, nome,
      areaPiso: round(areaPiso,2),
      desconto: round(desconto,2),
      areaLiquida: round(areaLiquida,2),
      areaAzulejo: round(areaAzulejo,2),
      materialPisoComMargem: round(materialPisoComMargem,2),
      materialAzulejoComMargem: round(materialAzulejoComMargem,2),
      subtotal: round(subtotal,2),
      subtotalPiso: round(subtotalPiso,2),
      subtotalAzulejo: round(subtotalAzulejo,2),
      valorPiso: round(valorPiso,2),
      valorAzulejo: round(valorAz,2)
    });

    totalPiso += areaPiso;
    totalDescontos += desconto;
    totalAzulejo += areaAzulejo;
    totalValor += subtotal;
  });

  return {
    resumo, totals:{
      totalPiso: round(totalPiso,2),
      totalDescontos: round(totalDescontos,2),
      totalAzulejo: round(totalAzulejo,2),
      totalValor: round(totalValor,2),
      margem: parseFloat(document.getElementById('margem')?.value) || 0,
      totalMaterialPisoComMargem: round(calcTotalMaterialPisoComMargem(),2),
      totalMaterialAzulejoComMargem: round(calcTotalMaterialAzulejoComMargem(),2)
    }
  };
}

function calcTotalMaterialPisoComMargem(){
  const margem = parseFloat(document.getElementById('margem')?.value) || 0;
  let sum = 0;
  document.querySelectorAll('.ambiente').forEach(node=>{
    const id = node.id.replace('amb','');
    const comp = parseFloat(document.getElementById(`comp${id}`)?.value) || 0;
    const larg = parseFloat(document.getElementById(`larg${id}`)?.value) || 0;
    let desconto = 0;
    const abContainer = document.getElementById(`aberturas${id}`);
    if(abContainer){
      const rows = abContainer.querySelectorAll('[id^="ab' + id + '_"]');
      rows.forEach(r => {
        const idx = r.id.split('_')[1];
        const lw = parseFloat(document.getElementById(`abLarg${id}_${idx}`)?.value) || 0;
        const lh = parseFloat(document.getElementById(`abAlt${id}_${idx}`)?.value) || 0;
        desconto += lw * lh;
      });
    }
    const areaLiquida = Math.max(0,(comp*larg)-desconto);
    sum += areaLiquida * (1 + margem/100);
  });
  return sum;
}

function calcTotalMaterialAzulejoComMargem(){
  const margem = parseFloat(document.getElementById('margem')?.value) || 0;
  let sum = 0;
  document.querySelectorAll('.ambiente').forEach(node=>{
    const id = node.id.replace('amb','');
    const comp = parseFloat(document.getElementById(`comp${id}`)?.value) || 0;
    const larg = parseFloat(document.getElementById(`larg${id}`)?.value) || 0;
    if(document.getElementById(`incluirAz${id}`)?.checked){
      const altAz = parseFloat(document.getElementById(`altAz${id}`)?.value) || 0;
      const perimetro = 2 * (comp + larg);
      const areaAzulejo = perimetro * altAz;
      sum += areaAzulejo * (1 + margem/100);
    }
  });
  return sum;
}

function calcularTotal(){
  const result = calcularResumoAmbientes();
  // total mão de obra não sofre margem
  const totalMaoObra = result.totals.totalValor;
  document.getElementById('valorTotal').innerText = `R$ ${formatBR(totalMaoObra)}`;
  atualizarPreview(result);
}

function atualizarPreview(result){
  const res = result || calcularResumoAmbientes();
  const tbody = document.querySelector('#previewTable tbody');
  tbody.innerHTML = '';
  if(res.resumo.length === 0){
    document.getElementById('previewArea').style.display = 'none';
    return;
  }
  res.resumo.forEach(r => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td style="text-align:left;padding-left:10px">${escapeHtml(r.nome)}</td>
      <td>${r.areaPiso.toFixed(2)}</td>
      <td>${r.desconto.toFixed(2)}</td>
      <td>${r.areaLiquida.toFixed(2)}</td>
      <td>${r.areaAzulejo.toFixed(2)}</td>
      <td>${r.materialPisoComMargem.toFixed(2)}</td>
      <td>${r.materialAzulejoComMargem.toFixed(2)}</td>
      <td>R$ ${formatBR(r.subtotal)}</td>`;
    tbody.appendChild(tr);
  });
  const totalMaoObra = res.totals.totalValor;
  document.getElementById('previewTotal').innerText = `R$ ${formatBR(totalMaoObra)}`;
  document.getElementById('previewArea').style.display = 'block';
}

// small debounce for frequent inputs
let updateTimer;
function atualizarPreviewDebounced(){ clearTimeout(updateTimer); updateTimer = setTimeout(()=>{ calcularTotal(); }, 250); }

function mostrarPreview(){ atualizarPreviewDebounced(); document.getElementById('previewArea').style.display = 'block'; }

function mostrarCampoObservacoes(){ document.getElementById('campoObservacoes').style.display='block'; document.getElementById('btnObservacoes').style.display='none'; }

// função principal: gerar PDF, abrir nova aba E baixar automaticamente usando html2pdf
function gerarPDFProfissional() {
  const result = calcularResumoAmbientes();

  // Monta container do PDF e injeta no DOM temporariamente (melhor renderização)
  const pdfContainer = document.createElement('div');
  pdfContainer.style.fontFamily = 'Inter, sans-serif';
  pdfContainer.style.padding = '20px';
  pdfContainer.style.background = '#fff';
  pdfContainer.style.color = '#102027';

  const prestadorNome = escapeHtml(document.getElementById('prestadorNome')?.value || '');
  const prestadorTelefone = escapeHtml(document.getElementById('prestadorTelefone')?.value || '');
  const prestadorEmail = escapeHtml(document.getElementById('prestadorEmail')?.value || '');
  const prestadorCnpj = escapeHtml(document.getElementById('prestadorCnpj')?.value || '');
  const prestadorEndereco = escapeHtml(document.getElementById('prestadorEndereco')?.value || '');

  const contratanteNome = escapeHtml(document.getElementById('contratanteNome')?.value || '');
  const contratanteTelefone = escapeHtml(document.getElementById('contratanteTelefone')?.value || '');
  const contratanteEmail = escapeHtml(document.getElementById('contratanteEmail')?.value || '');
  const contratanteEndereco = escapeHtml(document.getElementById('contratanteEndereco')?.value || '');

  const dataOrcamento = document.getElementById('dataOrcamento')?.value || '';
  const prazoEstimado = escapeHtml(document.getElementById('prazoEstimado')?.value || '');
  const observacoes = escapeHtml(document.getElementById('observacoes')?.value || '');

  pdfContainer.innerHTML = `
    <div style="text-align:center;margin-bottom:20px">
      <h1 style="color:#1e88e5;margin-bottom:4px">Orçamento Técnico</h1>
      <p style="margin:0;color:#6b7280;font-size:14px">Mão de Obra e Materiais - Pedreiro MEI</p>
    </div>

    <div style="display:flex;justify-content:space-between;margin-bottom:16px;font-size:13px">
      <div>
        <strong>Prestador</strong><br>
        ${prestadorNome}<br>
        ${prestadorTelefone}<br>
        ${prestadorEmail}<br>
        ${prestadorCnpj}<br>
        ${prestadorEndereco}
      </div>
      <div>
        <strong>Contratante</strong><br>
        ${contratanteNome}<br>
        ${contratanteTelefone}<br>
        ${contratanteEmail}<br>
        ${contratanteEndereco}
      </div>
      <div>
        <strong>Data</strong>: ${dataOrcamento}<br>
        <strong>Prazo Estimado</strong>: ${prazoEstimado}
      </div>
    </div>

    <table style="width:100%;border-collapse:collapse;font-size:12px">
      <thead>
        <tr style="background:#eef6fb">
          <th style="border:1px solid #dfe8f2;padding:6px">Ambiente</th>
          <th style="border:1px solid #dfe8f2;padding:6px">Piso (m²)</th>
          <th style="border:1px solid #dfe8f2;padding:6px">Descontos (m²)</th>
          <th style="border:1px solid #dfe8f2;padding:6px">Área Líquida (m²)</th>
          <th style="border:1px solid #dfe8f2;padding:6px">Azulejo (m²)</th>
          <th style="border:1px solid #dfe8f2;padding:6px">Material Piso c/ Margem (m²)</th>
          <th style="border:1px solid #dfe8f2;padding:6px">Material Azulejo c/ Margem (m²)</th>
          <th style="border:1px solid #dfe8f2;padding:6px">Subtotal (R$)</th>
        </tr>
      </thead>
      <tbody>
        ${result.resumo.map(r => `
          <tr>
            <td style="border:1px solid #dfe8f2;padding:6px;text-align:left">${escapeHtml(r.nome)}</td>
            <td style="border:1px solid #dfe8f2;padding:6px">${Number(r.areaPiso).toFixed(2)}</td>
            <td style="border:1px solid #dfe8f2;padding:6px">${Number(r.desconto).toFixed(2)}</td>
            <td style="border:1px solid #dfe8f2;padding:6px">${Number(r.areaLiquida).toFixed(2)}</td>
            <td style="border:1px solid #dfe8f2;padding:6px">${Number(r.areaAzulejo).toFixed(2)}</td>
            <td style="border:1px solid #dfe8f2;padding:6px">${Number(r.materialPisoComMargem).toFixed(2)}</td>
            <td style="border:1px solid #dfe8f2;padding:6px">${Number(r.materialAzulejoComMargem).toFixed(2)}</td>
            <td style="border:1px solid #dfe8f2;padding:6px">R$ ${formatBR(r.subtotal)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <div style="text-align:right;margin-top:12px;font-size:13px">
      <strong>Total Mão de Obra:</strong> R$ ${formatBR(result.totals.totalValor)}<br>
      <strong>Total Piso (m²):</strong> ${Number(result.totals.totalPiso).toFixed(2)}<br>
      <strong>Total Azulejo (m²):</strong> ${Number(result.totals.totalAzulejo).toFixed(2)}<br>
      <strong>Material Piso c/ Margem:</strong> ${Number(result.totals.totalMaterialPisoComMargem).toFixed(2)} m²<br>
      <strong>Material Azulejo c/ Margem:</strong> ${Number(result.totals.totalMaterialAzulejoComMargem).toFixed(2)} m²
    </div>

    ${observacoes ? `<div style="margin-top:16px;font-size:12px"><strong>Observações:</strong><br>${observacoes.replace(/\n/g,'<br>')}</div>` : ''}

    <div style="margin-top:24px">
      <div><strong>Assinatura do Prestador:</strong></div>
      <div style="height:40px;border-bottom:1px solid #ccc;width:300px;margin-top:12px"></div>
    </div>

    <div style="margin-top:10px;color:#6b7280;font-size:11px">Gerado em ${new Date().toLocaleDateString('pt-BR')}</div>
  `;

  document.body.appendChild(pdfContainer);

  html2pdf().set({
    margin: 10,
    filename: `Orcamento_${(contratanteNome || 'Cliente').replace(/\s+/g,'_')}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  }).from(pdfContainer).save().then(()=> {
    setTimeout(()=> pdfContainer.remove(), 800);
  }).catch(err=>{
    console.error(err);
    pdfContainer.remove();
  });
}

// helpers
function round(v, d){ return Math.round((v + Number.EPSILON) * Math.pow(10,d)) / Math.pow(10,d) }
function formatBR(n){ return Number(n).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}) }
function escapeHtml(t){ return (t || '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
