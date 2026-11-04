# Módulo: dados.js & Dados Históricos

O arquivo `src/dados.js` processa os dados operacionais e históricos localizados na pasta `dados_historicos/` e no índice temporal (`indice_datas.json`).

## Estrutura e Funcionalidades
- **Carregamento de Datas**: Lê o índice de datas disponíveis e os arquivos mensais (ex: `2026_03.json` até `2026_10.json`).
- **Indexação de Leituras**: Estrutura as leituras horárias de nível, vazão, vazão de entrada e horários.
- **Resumos Estatísticos**: Calcula mínimos, máximos, médias e qualidade das leituras (detecção de dados ausentes ou vazões negativas).

## Importação de Planilhas
- O conversor `python/atualizar_dados.py` lê planilhas Excel dentro de `Monitoramento Diário dos Reservatórios/` e grava os arquivos mensais em `dados_historicos/`.
- Instale `pandas` e `openpyxl` antes de executar `python3 python/atualizar_dados.py`.
- A data do nome do arquivo recebe um dia adicional para representar a madrugada seguinte. Espaços ao redor do separador são aceitos.
- Arquivos temporários do Excel e relatórios chamados "Ocorrências" são ignorados. Arquivos sem data reconhecível também não são importados.
- As novas datas são combinadas com o índice existente para preservar datas anteriores; faça backup dos JSONs antes de importar.
