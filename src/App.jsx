import React, { useState, useEffect } from 'react';
import { 
  Calculator, User, Phone, Calendar, DollarSign, Briefcase, 
  AlertCircle, CheckCircle2, Lock, ChevronRight, ChevronLeft, 
  Settings, Database, ArrowLeft, RefreshCw, Send, Clock, 
  ShieldAlert, AlertTriangle
} from 'lucide-react';

const calcularDireitos = (data) => {
  const admissao = new Date(data.dataAdmissao);
  const demissao = new Date(data.dataDemissao);
  const salario = parseFloat(data.salario.replace(/[^0-9,.-]/g, '').replace(',', '.'));
  
  if (isNaN(salario) || admissao >= demissao) return null;

  const tempoServicoDias = Math.floor((demissao - admissao) / (1000 * 60 * 60 * 24));
  const anosCompletos = Math.floor(tempoServicoDias / 365);
  const mesesCompletos = Math.floor(tempoServicoDias / 30);

  const SALARIO_MINIMO = 1412; 
  
  let adicionalPericulosidade = 0;
  let periculosidadeAtrasada = 0;
  if (data.periculosidade === 'sim') {
    adicionalPericulosidade = salario * 0.30;
    if (data.recebiaPericulosidade === 'nao') {
      const mesesTrabalhados = mesesCompletos === 0 ? 1 : mesesCompletos;
      periculosidadeAtrasada = adicionalPericulosidade * mesesTrabalhados;
    }
  }

  let adicionalInsalubridade = 0;
  let insalubridadeAtrasada = 0;
  if (data.insalubridade === 'minimo') adicionalInsalubridade = SALARIO_MINIMO * 0.10;
  else if (data.insalubridade === 'medio') adicionalInsalubridade = SALARIO_MINIMO * 0.20;
  else if (data.insalubridade === 'maximo') adicionalInsalubridade = SALARIO_MINIMO * 0.40;

  if (data.insalubridade !== 'nao' && data.recebiaInsalubridade === 'nao') {
    const mesesTrabalhados = mesesCompletos === 0 ? 1 : mesesCompletos;
    insalubridadeAtrasada = adicionalInsalubridade * mesesTrabalhados;
  }

  const adicionalMensal = Math.max(adicionalPericulosidade, adicionalInsalubridade);
  const remuneracaoBase = salario + adicionalMensal; 

  let estimativaHorasExtras = 0;
  if (data.faziaHorasExtras === 'sim' && data.pagavaHorasExtras === 'nao') {
    const horasSemanais = parseFloat(data.horasExtrasSemana) || 0;
    const valorHoraNormal = remuneracaoBase / 220;
    const valorHoraExtra = valorHoraNormal * 1.5; 
    const horasMes = horasSemanais * 4.33; 
    const mesesTrabalhados = mesesCompletos === 0 ? 1 : mesesCompletos;
    estimativaHorasExtras = valorHoraExtra * horasMes * mesesTrabalhados;
  }

  let saldoSalario = 0, avisoPrevio = 0, decimoTerceiro = 0;
  let feriasProporcionais = 0, tercoFerias = 0, multaFGTS = 0;

  const simulaSemJustaCausa = data.motivoDemissao === 'sem_justa_causa' || data.motivoDemissao === 'ainda_trabalhando';

  const diasTrabalhadosMes = demissao.getDate();
  saldoSalario = (remuneracaoBase / 30) * diasTrabalhadosMes;

  let diasAviso = 0;
  if (simulaSemJustaCausa && data.avisoPrevio === 'indenizado') {
    diasAviso = 30 + (anosCompletos * 3);
    if (diasAviso > 90) diasAviso = 90; 
    avisoPrevio = (remuneracaoBase / 30) * diasAviso;
  }

  const dataProjetada = new Date(demissao);
  dataProjetada.setDate(dataProjetada.getDate() + diasAviso);

  const mesesAnoDemissao = dataProjetada.getMonth() + (dataProjetada.getDate() >= 15 ? 1 : 0);
  decimoTerceiro = (remuneracaoBase / 12) * mesesAnoDemissao;

  const mesesDesdeUltimasFerias = (mesesCompletos + (diasAviso > 0 ? 1 : 0)) % 12;
  const mesesParaFerias = mesesDesdeUltimasFerias === 0 && tempoServicoDias > 0 ? 12 : mesesDesdeUltimasFerias;
  
  if (data.motivoDemissao !== 'justa_causa') {
    feriasProporcionais = (remuneracaoBase / 12) * mesesParaFerias;
    tercoFerias = feriasProporcionais / 3;
  }

  const mesesTotaisEstimados = mesesCompletos;
  const saldoFGTSEstimado = (remuneracaoBase * 0.08) * mesesTotaisEstimados;
  
  if (simulaSemJustaCausa) {
    multaFGTS = saldoFGTSEstimado * 0.40;
  }

  let descontos = 0;
  if (data.motivoDemissao === 'pedido_demissao' && data.avisoPrevio === 'nao_cumprido') {
    descontos = remuneracaoBase; 
  }

  const subtotalRescisao = (saldoSalario + avisoPrevio + decimoTerceiro + feriasProporcionais + tercoFerias + multaFGTS) - descontos;
  const totalValoresAtrasados = periculosidadeAtrasada + insalubridadeAtrasada + estimativaHorasExtras;
  const total = (subtotalRescisao > 0 ? subtotalRescisao : 0) + totalValoresAtrasados;

  return {
    adicionalMensal, periculosidadeAtrasada, insalubridadeAtrasada,
    estimativaHorasExtras, saldoSalario, avisoPrevio, decimoTerceiro,
    feriasProporcionais, tercoFerias, multaFGTS, descontos,
    total: total > 0 ? total : 0
  };
};

const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

export default function App() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    nome: '', whatsapp: '', dataAdmissao: '', dataDemissao: '', salario: '',
    motivoDemissao: 'sem_justa_causa', avisoPrevio: 'indenizado',
    periculosidade: 'nao', recebiaPericulosidade: 'sim',
    insalubridade: 'nao', recebiaInsalubridade: 'sim',
    faziaHorasExtras: 'nao', horasExtrasSemana: '', pagavaHorasExtras: 'sim'
  });
  
  const [resultado, setResultado] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [adminMode, setAdminMode] = useState(false);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  
  const [leads, setLeads] = useState([]);
  const [webhookUrl, setWebhookUrl] = useState('[https://seu-dominio.n8n.cloud/webhook/direitos-trabalhistas](https://seu-dominio.n8n.cloud/webhook/direitos-trabalhistas)');

  useEffect(() => {
    fetch('/api/config')
      .then(res => res.json())
      .then(data => { if (data.webhookUrl) setWebhookUrl(data.webhookUrl); })
      .catch(() => console.log('Backend indisponível no preview.'));

    fetch('/api/leads')
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setLeads(data); })
      .catch(() => console.log('Backend indisponível no preview.'));
  }, []);

  const handleInputChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  const nextStep = () => setStep(prev => prev + 1);
  const prevStep = () => setStep(prev => prev - 1);

  const enviarParaWebhook = async (dadosCalculo) => {
    try {
      const payload = {
        lead: { nome: formData.nome, whatsapp: formData.whatsapp },
        vinculo: { admissao: formData.dataAdmissao, demissao: formData.dataDemissao, salarioBase: formData.salario, motivo: formData.motivoDemissao },
        condicoes: { periculosidade: formData.periculosidade, recebiaPericulosidade: formData.recebiaPericulosidade, insalubridade: formData.insalubridade, recebiaInsalubridade: formData.recebiaInsalubridade, faziaHorasExtras: formData.faziaHorasExtras, horasExtrasSemana: formData.horasExtrasSemana, pagavaHorasExtras: formData.pagavaHorasExtras },
        resultado: dadosCalculo, dataConsulta: new Date().toISOString()
      };
      await fetch(webhookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    } catch (error) { console.error('Erro ao enviar para o webhook:', error); }
  };

  const salvarWebhookNoServidor = () => {
    fetch('/api/config', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ webhookUrl })
    }).then(() => alert('Configuração salva na VPS com sucesso!'))
      .catch(() => alert('Erro ao salvar no servidor.'));
  };

  const calcular = () => {
    setIsCalculating(true); setStep(6);
    setTimeout(() => {
      const calculo = calcularDireitos(formData);
      setResultado(calculo); setIsCalculating(false);
      
      if (calculo) {
        const novoLead = { id: Date.now(), data: new Date().toLocaleString('pt-BR'), nome: formData.nome, whatsapp: formData.whatsapp, valorEstimado: calculo.total };
        setLeads(prev => [novoLead, ...prev]);
        fetch('/api/leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(novoLead) })
          .catch(() => console.log('Erro ao enviar lead para o backend.'));
        enviarParaWebhook(calculo);
      }
    }, 2000);
  };

  const handleAdminLogin = (e) => {
    e.preventDefault();
    if (adminPassword === '36672456') { setAdminMode(true); setShowPasswordPrompt(false); setAdminPassword(''); } 
    else { alert('Senha incorreta!'); }
  };

  const resetForm = () => {
    setStep(1); setResultado(null);
    setFormData({ nome: '', whatsapp: '', dataAdmissao: '', dataDemissao: '', salario: '', motivoDemissao: 'sem_justa_causa', avisoPrevio: 'indenizado', periculosidade: 'nao', recebiaPericulosidade: 'sim', insalubridade: 'nao', recebiaInsalubridade: 'sim', faziaHorasExtras: 'nao', horasExtrasSemana: '', pagavaHorasExtras: 'sim' });
  };

  if (adminMode) {
    return (
      <div className="min-h-screen bg-slate-100 p-6 font-sans">
        <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-slate-800 p-6 flex justify-between items-center text-white">
            <div className="flex items-center gap-3"><Database className="h-6 w-6" /><h1 className="text-xl font-bold">Painel de Administração</h1></div>
            <button onClick={() => setAdminMode(false)} className="flex items-center gap-2 text-slate-300 hover:text-white transition text-sm"><ArrowLeft className="h-4 w-4" /> Voltar ao App</button>
          </div>
          <div className="p-6 space-y-8">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4"><Settings className="h-5 w-5 text-blue-600" /> Configuração do n8n Webhook</h2>
              <div className="flex gap-3">
                <input type="text" value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} className="flex-1 rounded-lg border-slate-300 border p-3 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="https://sua-url-do-n8n/webhook/..." />
                <button onClick={salvarWebhookNoServidor} className="bg-blue-600 text-white px-6 rounded-lg font-medium hover:bg-blue-700 transition">Salvar</button>
              </div>
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4"><User className="h-5 w-5 text-blue-600" /> Leads Capturados ({leads.length})</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead><tr className="bg-slate-100 border-b border-slate-200 text-sm text-slate-600"><th className="p-3">Data</th><th className="p-3">Nome</th><th className="p-3">WhatsApp</th><th className="p-3">Valor Estimado</th></tr></thead>
                  <tbody>
                    {leads.length === 0 ? <tr><td colSpan="4" className="p-6 text-center text-slate-500">Nenhum cálculo realizado.</td></tr> : leads.map((lead) => (
                      <tr key={lead.id} className="border-b border-slate-100 hover:bg-slate-50"><td className="p-3 text-sm text-slate-600">{lead.data}</td><td className="p-3 font-medium text-slate-800">{lead.nome}</td><td className="p-3 text-sm text-slate-600">{lead.whatsapp}</td><td className="p-3 font-medium text-green-600">{formatCurrency(lead.valorEstimado)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100">
          <div className="bg-blue-600 p-6 text-white text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full bg-blue-700 opacity-20 transform -skew-y-6 origin-top-left z-0"></div>
            <div className="relative z-10"><Briefcase className="h-10 w-10 mx-auto mb-3 opacity-90" /><h1 className="text-2xl font-bold">Calculadora Trabalhista</h1><p className="text-blue-100 text-sm mt-1">Sua rescisão de forma clara</p></div>
          </div>
          {step < 6 && <div className="bg-slate-50 h-1.5 w-full"><div className="bg-blue-500 h-1.5 transition-all duration-300" style={{ width: `${(step / 5) * 100}%` }}></div></div>}
          <div className="p-6 md:p-8">
            
            {/* Step 1 */}
            {step === 1 && (
              <div className="space-y-6 animate-fade-in">
                <div className="text-center mb-8"><h2 className="text-2xl font-bold text-slate-800">Vamos começar</h2></div>
                <div className="space-y-4">
                  <div><label className="block text-sm font-medium mb-1">Seu Nome Completo</label><input type="text" name="nome" value={formData.nome} onChange={handleInputChange} className="w-full rounded-lg border-slate-300 border p-3 focus:ring-blue-500 outline-none" /></div>
                  <div><label className="block text-sm font-medium mb-1">WhatsApp</label><input type="tel" name="whatsapp" value={formData.whatsapp} onChange={handleInputChange} className="w-full rounded-lg border-slate-300 border p-3 focus:ring-blue-500 outline-none" /></div>
                </div>
                <button onClick={nextStep} disabled={!formData.nome || !formData.whatsapp} className="w-full bg-blue-600 text-white p-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50">Avançar</button>
              </div>
            )}

            {/* Step 2 */}
            {step === 2 && (
              <div className="space-y-6 animate-fade-in">
                <div className="text-center mb-8"><h2 className="text-2xl font-bold text-slate-800">Período de Trabalho</h2></div>
                <div className="space-y-4">
                  <div><label className="block text-sm font-medium mb-1">Data de Admissão</label><input type="date" name="dataAdmissao" value={formData.dataAdmissao} onChange={handleInputChange} className="w-full rounded-lg border-slate-300 border p-3" /></div>
                  <div><label className="block text-sm font-medium mb-1">Data de Saída (ou hoje)</label><input type="date" name="dataDemissao" value={formData.dataDemissao} onChange={handleInputChange} className="w-full rounded-lg border-slate-300 border p-3" /></div>
                </div>
                <div className="flex gap-3"><button onClick={prevStep} className="flex-1 bg-slate-100 p-3 rounded-lg">Voltar</button><button onClick={nextStep} disabled={!formData.dataAdmissao || !formData.dataDemissao} className="flex-[2] bg-blue-600 text-white p-3 rounded-lg disabled:opacity-50">Avançar</button></div>
              </div>
            )}

            {/* Step 3 */}
            {step === 3 && (
              <div className="space-y-6 animate-fade-in">
                <div className="text-center mb-8"><h2 className="text-2xl font-bold text-slate-800">Salário e Motivo</h2></div>
                <div className="space-y-4">
                  <div><label className="block text-sm font-medium mb-1">Último Salário Base</label><input type="number" name="salario" value={formData.salario} onChange={handleInputChange} className="w-full rounded-lg border p-3" /></div>
                  <div><label className="block text-sm font-medium mb-1">Motivo da Saída</label>
                    <select name="motivoDemissao" value={formData.motivoDemissao} onChange={handleInputChange} className="w-full rounded-lg border p-3 bg-white">
                      <option value="sem_justa_causa">Fui demitido (Sem justa causa)</option><option value="pedido_demissao">Pedi demissão</option><option value="justa_causa">Fui demitido (Com justa causa)</option><option value="ainda_trabalhando">Ainda estou trabalhando (Simular)</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-3"><button onClick={prevStep} className="flex-1 bg-slate-100 p-3 rounded-lg">Voltar</button><button onClick={nextStep} disabled={!formData.salario} className="flex-[2] bg-blue-600 text-white p-3 rounded-lg disabled:opacity-50">Avançar</button></div>
              </div>
            )}

            {/* Step 4 */}
            {step === 4 && (
              <div className="space-y-6 animate-fade-in">
                <div className="text-center mb-8"><h2 className="text-2xl font-bold text-slate-800">Condições</h2></div>
                <div className="space-y-5">
                  <div><label className="block text-sm mb-1">Local perigoso? (Periculosidade)</label>
                    <select name="periculosidade" value={formData.periculosidade} onChange={handleInputChange} className="w-full rounded-lg border p-3 bg-white"><option value="nao">Não</option><option value="sim">Sim</option></select>
                    {formData.periculosidade === 'sim' && (<div className="mt-2 pl-4 border-l-2 border-blue-500"><label className="block text-sm">Recebia no contracheque?</label><select name="recebiaPericulosidade" value={formData.recebiaPericulosidade} onChange={handleInputChange} className="w-full rounded-lg border p-3 bg-white"><option value="sim">Sim</option><option value="nao">Não</option></select></div>)}
                  </div>
                  <div><label className="block text-sm mb-1">Local insalubre?</label>
                    <select name="insalubridade" value={formData.insalubridade} onChange={handleInputChange} className="w-full rounded-lg border p-3 bg-white"><option value="nao">Não</option><option value="minimo">Sim (10%)</option><option value="medio">Sim (20%)</option><option value="maximo">Sim (40%)</option></select>
                    {formData.insalubridade !== 'nao' && (<div className="mt-2 pl-4 border-l-2 border-blue-500"><label className="block text-sm">Recebia no contracheque?</label><select name="recebiaInsalubridade" value={formData.recebiaInsalubridade} onChange={handleInputChange} className="w-full rounded-lg border p-3 bg-white"><option value="sim">Sim</option><option value="nao">Não</option></select></div>)}
                  </div>
                  <div><label className="block text-sm mb-1">Fazia horas extras?</label>
                    <select name="faziaHorasExtras" value={formData.faziaHorasExtras} onChange={handleInputChange} className="w-full rounded-lg border p-3 bg-white"><option value="nao">Não</option><option value="sim">Sim</option></select>
                    {formData.faziaHorasExtras === 'sim' && (<div className="mt-2 pl-4 border-l-2 border-blue-500 space-y-2"><input type="number" name="horasExtrasSemana" value={formData.horasExtrasSemana} onChange={handleInputChange} placeholder="Horas por semana" className="w-full border p-3 rounded-lg" /><select name="pagavaHorasExtras" value={formData.pagavaHorasExtras} onChange={handleInputChange} className="w-full border p-3 rounded-lg bg-white"><option value="sim">Empresa pagava</option><option value="nao">Não pagava</option></select></div>)}
                  </div>
                </div>
                <div className="flex gap-3"><button onClick={prevStep} className="flex-1 bg-slate-100 p-3 rounded-lg">Voltar</button><button onClick={nextStep} disabled={formData.faziaHorasExtras === 'sim' && !formData.horasExtrasSemana} className="flex-[2] bg-blue-600 text-white p-3 rounded-lg">Avançar</button></div>
              </div>
            )}

            {/* Step 5 */}
            {step === 5 && (
              <div className="space-y-6 animate-fade-in">
                <div className="text-center mb-8"><h2 className="text-2xl font-bold text-slate-800">Aviso Prévio</h2></div>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-3">
                    {[{ id: 'indenizado', label: 'Indenizado (Receber sem trabalhar)' }, { id: 'trabalhado', label: 'Trabalhado' }, { id: 'nao_cumprido', label: 'Não cumprido (Descontado)' }].map(op => (
                      <label key={op.id} className={`flex items-center p-4 border rounded-lg cursor-pointer ${formData.avisoPrevio === op.id ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : ''}`}><input type="radio" name="avisoPrevio" value={op.id} checked={formData.avisoPrevio === op.id} onChange={handleInputChange} className="hidden" /><span className={formData.avisoPrevio === op.id ? 'text-blue-700 font-medium' : ''}>{op.label}</span></label>
                    ))}
                  </div>
                </div>
                <div className="flex gap-3"><button onClick={prevStep} className="flex-1 bg-slate-100 p-3 rounded-lg">Voltar</button><button onClick={calcular} className="flex-[2] bg-green-600 text-white p-3 rounded-lg">Calcular Direitos</button></div>
              </div>
            )}

            {/* Step 6 Result */}
            {step === 6 && (
              isCalculating ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-4 animate-fade-in"><RefreshCw className="h-12 w-12 text-blue-600 animate-spin" /><h2 className="text-xl font-medium">Calculando...</h2></div>
              ) : resultado ? (
                <div className="space-y-6 animate-fade-in">
                  <div className="text-center mb-6"><div className="inline-flex w-16 h-16 bg-green-100 rounded-full mb-4 items-center justify-center"><CheckCircle2 className="h-8 w-8 text-green-600" /></div><h2 className="text-2xl font-bold">Cálculo Concluído</h2></div>
                  <div className="bg-slate-50 rounded-xl p-5 border">
                    <h3 className="font-semibold mb-4 border-b pb-2">Resumo da Estimativa</h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between"><span>Saldo de Salário</span><span className="font-medium">{formatCurrency(resultado.saldoSalario)}</span></div>
                      {resultado.avisoPrevio > 0 && <div className="flex justify-between"><span>Aviso Prévio</span><span className="font-medium">{formatCurrency(resultado.avisoPrevio)}</span></div>}
                      <div className="flex justify-between"><span>13º Proporcional</span><span className="font-medium">{formatCurrency(resultado.decimoTerceiro)}</span></div>
                      <div className="flex justify-between"><span>Férias + 1/3</span><span className="font-medium">{formatCurrency(resultado.feriasProporcionais + resultado.tercoFerias)}</span></div>
                      {resultado.multaFGTS > 0 && <div className="flex justify-between"><span>Multa FGTS</span><span className="font-medium">{formatCurrency(resultado.multaFGTS)}</span></div>}
                      {resultado.descontos > 0 && <div className="flex justify-between text-red-600"><span>Descontos</span><span className="font-medium">-{formatCurrency(resultado.descontos)}</span></div>}
                      {(resultado.periculosidadeAtrasada > 0 || resultado.insalubridadeAtrasada > 0 || resultado.estimativaHorasExtras > 0) && (
                        <div className="pt-2 mt-2 border-t bg-orange-50 -mx-5 px-5 py-2">
                          <span className="text-slate-800 font-medium">Valores Atrasados / Extras:</span>
                          <span className="font-medium text-orange-600 block">+{formatCurrency(resultado.periculosidadeAtrasada + resultado.insalubridadeAtrasada + resultado.estimativaHorasExtras)}</span>
                        </div>
                      )}
                      <div className="pt-3 mt-3 border-t flex justify-between items-center"><span className="font-bold text-base">Total Líquido Estimado</span><span className="font-bold text-green-600 text-xl">{formatCurrency(resultado.total)}</span></div>
                    </div>
                  </div>
                  <button onClick={resetForm} className="w-full bg-slate-800 text-white p-3 rounded-lg font-medium">Fazer novo cálculo</button>
                </div>
              ) : null
            )}
          </div>
        </div>
      </main>

      <footer className="py-4 text-center text-slate-400 text-xs flex justify-center items-center gap-1">
        <span>&copy; {new Date().getFullYear()} Calculadora Trabalhista CLT.</span>
        <button onClick={() => setShowPasswordPrompt(true)} className="p-1 hover:text-slate-600"><Lock className="h-3 w-3" /></button>
      </footer>

      {showPasswordPrompt && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold mb-2">Acesso Restrito</h3>
            <p className="text-sm text-slate-500 mb-4">Insira a senha para acessar os dados.</p>
            <form onSubmit={handleAdminLogin}>
              <input type="password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} className="w-full rounded-lg border p-3 mb-4" placeholder="Senha" autoFocus />
              <div className="flex gap-2"><button type="button" onClick={() => setShowPasswordPrompt(false)} className="flex-1 bg-slate-100 p-2 rounded-lg">Cancelar</button><button type="submit" className="flex-1 bg-slate-800 text-white p-2 rounded-lg">Acessar</button></div>
            </form>
          </div>
        </div>
      )}
      <style dangerouslySetInnerHTML={{__html: `.animate-fade-in { animation: fadeIn 0.4s ease-in-out; } @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }`}} />
    </div>
  );
}


2. server.js

Crie este arquivo na raiz do seu projeto (na mesma pasta onde está o package.json).

const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// Pasta persistente no Docker
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'dados.json');

// Garante que o arquivo de dados existe
async function initDataFile() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    try {
      await fs.access(DATA_FILE);
    } catch {
      await fs.writeFile(DATA_FILE, JSON.stringify({ 
        webhookUrl: '[https://seu-dominio.n8n.cloud/webhook/direitos-trabalhistas](https://seu-dominio.n8n.cloud/webhook/direitos-trabalhistas)', 
        leads: [] 
      }, null, 2));
    }
  } catch (error) {
    console.error('Erro ao iniciar o arquivo de dados:', error);
  }
}

initDataFile();

// Ler banco de dados JSON
async function readDb() {
  const data = await fs.readFile(DATA_FILE, 'utf-8');
  return JSON.parse(data);
}

// Escrever banco de dados JSON
async function writeDb(data) {
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
}

// --- API ENDPOINTS ---
app.get('/api/config', async (req, res) => {
  try {
    const db = await readDb();
    res.json({ webhookUrl: db.webhookUrl });
  } catch (err) { res.status(500).json({ error: 'Erro no servidor' }); }
});

app.post('/api/config', async (req, res) => {
  try {
    const { webhookUrl } = req.body;
    const db = await readDb();
    db.webhookUrl = webhookUrl;
    await writeDb(db);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Erro no servidor' }); }
});

app.get('/api/leads', async (req, res) => {
  try {
    const db = await readDb();
    res.json(db.leads);
  } catch (err) { res.status(500).json({ error: 'Erro no servidor' }); }
});

app.post('/api/leads', async (req, res) => {
  try {
    const newLead = req.body;
    const db = await readDb();
    db.leads.unshift(newLead); // Adiciona no começo
    await writeDb(db);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Erro no servidor' }); }
});

// Serve os arquivos estáticos do React
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
