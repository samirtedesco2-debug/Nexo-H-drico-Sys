import pandas as pd
import json
import os
import re
import csv
from datetime import datetime, timedelta

NOME_PASTA = "Monitoramento Diário dos Reservatórios"

# Descobre a pasta raiz do projeto
DIRETORIO_ATUAL = os.path.dirname(os.path.abspath(__file__))
RAIZ_PROJETO = os.path.dirname(DIRETORIO_ATUAL) if os.path.basename(DIRETORIO_ATUAL) == "python" else DIRETORIO_ATUAL

PASTA_DADOS = os.path.join(RAIZ_PROJETO, "dados_historicos")
CAMINHO_INDICE = os.path.join(RAIZ_PROJETO, "indice_datas.json")

def arquivar_relatorio_incidentes_cron(incidentes_lista=None):
    if incidentes_lista is None:
        incidentes_lista = []
    
    agora = datetime.now()
    ano = agora.strftime("%Y")
    mes = agora.strftime("%m")
    
    pasta_destino = os.path.join(RAIZ_PROJETO, "relatorios_emitidos", "incidentes", ano, mes)
    os.makedirs(pasta_destino, exist_ok=True)
    
    timestamp_str = agora.strftime("%Y-%m-%d_%H-%M")
    nome_arquivo = f"relatorio_SLA_{timestamp_str}.csv"
    caminho_arquivo = os.path.join(pasta_destino, nome_arquivo)
    
    try:
        with open(caminho_arquivo, mode="w", newline="", encoding="utf-8-sig") as f:
            writer = csv.writer(f, delimiter=";")
            writer.writerow(["Timestamp", "Chave", "Nome", "Severidade", "Acao", "TempoRespostaMs"])
            for inc in incidentes_lista:
                writer.writerow([
                    inc.get("timestamp", ""),
                    inc.get("chave", ""),
                    inc.get("nome", ""),
                    inc.get("severidade", ""),
                    inc.get("acao", ""),
                    inc.get("tempoRespostaMs", "")
                ])
        print(f"📊 Relatório SLA de incidentes arquivado em: {caminho_arquivo}")
    except Exception as e:
        print(f"⚠️ Erro ao arquivar relatório de incidentes: {e}")

def encontrar_pasta_raiz():
    for item in os.listdir(RAIZ_PROJETO):
        if os.path.isdir(os.path.join(RAIZ_PROJETO, item)) and "monitoramento" in item.lower():
            return os.path.join(RAIZ_PROJETO, item)
    return os.path.join(RAIZ_PROJETO, NOME_PASTA)

PASTA_PLANILHAS = encontrar_pasta_raiz()

def parse_num(v, is_level=True):
    if pd.isna(v) or str(v).strip() in ['-', 'nan', '']:
        return None
    try:
        val = float(str(v).replace('%', '').replace(',', '.').strip())
        if is_level and 0 < val <= 1.0:
            val = val * 100
        return round(val, 1)
    except:
        return None

def extrair_e_ajustar_data(nome_arquivo):
    """Extrai a data do nome do arquivo e ADICIONA 1 dia para alinhar 
       com os dados da madrugada que ocorrem no dia seguinte (ex: arquivo de 01/10 vira 02/10)."""
    padrao = r'(\d{1,2})\s*[-_\./]\s*(\d{1,2})(?:\s*[-_\./]\s*(\d{2,4}))?'
    match = re.search(padrao, nome_arquivo)
    if match:
        dia = int(match.group(1))
        mes = int(match.group(2))
        ano_str = match.group(3) if match.group(3) else "2026"
        if len(ano_str) == 2:
            ano = int(f"20{ano_str}")
        else:
            ano = int(ano_str)
            
        try:
            data_original = datetime(ano, mes, dia)
            # Adiciona 1 dia para refletir o dia da madrugada (ex: 01/10 passa a ser 02/10)
            data_corrigida = data_original + timedelta(days=1)
            return data_corrigida.strftime("%d/%m/%Y")
        except Exception:
            return None
    return None

def processar_pasta_planilhas():
    os.makedirs(PASTA_DADOS, exist_ok=True)
    horarios = ["00:15", "01:15", "02:15", "03:15", "04:15", "05:15"]

    if not os.path.exists(PASTA_PLANILHAS):
        print(f"❌ Pasta de monitoramento não encontrada em:\n   {PASTA_PLANILHAS}")
        return

    arquivos_excel = []
    for raiz, _, arquivos in os.walk(PASTA_PLANILHAS):
        for arq in arquivos:
            ext = os.path.splitext(arq)[1].lower()
            if ext in ['.xlsx', '.xls', '.xlsm'] and not arq.startswith('~$'):
                arquivos_excel.append(os.path.join(raiz, arq))

    if not arquivos_excel:
        print("⚠️ Nenhum arquivo Excel foi encontrado.")
        return

    print(f"🔍 Processando {len(arquivos_excel)} planilha(s)...\n")

    caminho_config = os.path.join(PASTA_DADOS, "config_reservatorios.json")
    config_reservatorios = {}
    if os.path.exists(caminho_config):
        try:
            with open(caminho_config, "r", encoding="utf-8") as f:
                config_reservatorios = json.load(f)
        except Exception as e:
            print(f"⚠️ Erro ao carregar {caminho_config}: {e}")

    datas_encontradas = set()
    datas_existentes = set()
    if os.path.exists(CAMINHO_INDICE):
        try:
            with open(CAMINHO_INDICE, "r", encoding="utf-8") as f:
                indice_existente = json.load(f)
            datas_existentes.update(indice_existente.get("datasDisponiveis", []))
        except Exception as e:
            print(f"❌ Não foi possível ler o índice existente; importação cancelada: {e}")
            return
    
    for caminho_excel in arquivos_excel:
        nome_arquivo = os.path.basename(caminho_excel)
        if re.search(r"ocorr[eê]ncias", nome_arquivo, re.IGNORECASE):
            print(f"⏭️ Relatório de período ignorado: {nome_arquivo}")
            continue

        data_planilha = extrair_e_ajustar_data(nome_arquivo)
        
        if not data_planilha:
            print(f"⚠️ Não foi possível identificar a data em: {nome_arquivo}. Ignorando.")
            continue

        print(f"📂 Processando arquivo '{nome_arquivo}' -> Atribuído à madrugada do dia: {data_planilha}")

        try:
            df = pd.read_excel(caminho_excel, sheet_name=0)
        except Exception as e:
            print(f"   ⚠️ Erro ao ler {nome_arquivo}: {e}\n")
            continue

        reservatorios_dia = {}

        for r in range(2, min(24, len(df))):
            grupo = str(df.iloc[r, 0]).strip()
            nome = str(df.iloc[r, 1]).strip()

            if not nome or nome == 'nan':
                continue

            niveis = []
            vazoes = []

            for c in range(8, 20, 2):
                if c + 1 < len(df.columns):
                    n = parse_num(df.iloc[r, c], is_level=True)
                    v = parse_num(df.iloc[r, c+1], is_level=False)
                    niveis.append(n)
                    vazoes.append(v)

            niveis_validos = [x for x in niveis if x is not None]
            vazoes_validas = [x for x in vazoes if x is not None]

            nivel_atual = niveis_validos[-1] if niveis_validos else None
            nivel_min = min(niveis_validos) if niveis_validos else None
            nivel_max = max(niveis_validos) if niveis_validos else None
            nivel_medio = round(sum(niveis_validos)/len(niveis_validos), 1) if niveis_validos else None

            vazao_atual = vazoes_validas[-1] if vazoes_validas else None
            vazao_min = min(vazoes_validas) if vazoes_validas else None
            vazao_max = max(vazoes_validas) if vazoes_validas else None
            vazao_media = round(sum(vazoes_validas)/len(vazoes_validas), 1) if vazoes_validas else None

            cfg_res = config_reservatorios.get(nome, {})
            limite_critico = float(cfg_res.get("nivelCritico", 40))
            limite_atencao = float(cfg_res.get("nivelAtencao", 60))

            status = "Normal"
            if nivel_atual is not None:
                if nivel_atual < limite_critico:
                    status = "Crítico"
                elif nivel_atual < limite_atencao:
                    status = "Atenção"
            else:
                status = "Sem Dados"

            reservatorios_dia[nome] = {
                "nome": nome,
                "grupo": grupo,
                "kpis": {
                    "nivelAtual": f"{nivel_atual}%" if nivel_atual is not None else "N/A",
                    "nivelMedio": f"{nivel_medio}%" if nivel_medio is not None else "N/A",
                    "nivelMin": f"{nivel_min}%" if nivel_min is not None else "N/A",
                    "nivelMax": f"{nivel_max}%" if nivel_max is not None else "N/A",
                    "vazaoAtual": f"{vazao_atual} L/s" if vazao_atual is not None else "N/A",
                    "vazaoMin": f"{vazao_min} L/s" if vazao_min is not None else "N/A",
                    "vazaoMax": f"{vazao_max} L/s" if vazao_max is not None else "N/A",
                    "vazaoMedia": f"{vazao_media} L/s" if vazao_media is not None else "N/A",
                    "status": status
                },
                "leituras": {
                    "nivel": niveis,
                    "vazao": vazoes
                }
            }

        partes_data = data_planilha.split('/')
        ano_mes = f"{partes_data[2]}_{partes_data[1]}"
        caminho_mensal = os.path.join(PASTA_DADOS, f"{ano_mes}.json")

        dados_mensais = {"anoMes": ano_mes, "dias": {}}
        if os.path.exists(caminho_mensal):
            try:
                with open(caminho_mensal, "r", encoding="utf-8") as f:
                    dados_mensais = json.load(f)
            except Exception as e:
                print(f"   ⚠️ JSON mensal inválido; arquivo ignorado para evitar sobrescrita: {caminho_mensal}: {e}")
                continue

        dados_mensais["dias"][data_planilha] = {
            "ultimaAtualizacao": f"{data_planilha} 05:15",
            "horarios": horarios,
            "reservatorios": reservatorios_dia
        }

        with open(caminho_mensal, "w", encoding="utf-8") as f:
            json.dump(dados_mensais, f, indent=2, ensure_ascii=False)

        datas_encontradas.add(data_planilha)

    lista_datas = sorted(
        datas_existentes | datas_encontradas,
        key=lambda x: datetime.strptime(x, "%d/%m/%Y"),
    )
    indice = {"datasDisponiveis": lista_datas}
    with open(CAMINHO_INDICE, "w", encoding="utf-8") as f:
        json.dump(indice, f, indent=2, ensure_ascii=False)

    print("\n🎉 Sucesso! As datas foram ajustadas somando 1 dia para refletir corretamente o período da madrugada.")

if __name__ == "__main__":
    processar_pasta_planilhas()