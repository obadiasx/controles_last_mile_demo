"""Script para gerar PDF a partir do Markdown da documentação."""
import os
from pathlib import Path

from markdown_pdf import MarkdownPdf, Section

DOCS_DIR = Path(__file__).parent
MD_FILE = DOCS_DIR / "DOCUMENTACAO_ERP_SABOR_DA_TERRA.md"
PDF_FILE = DOCS_DIR / "DOCUMENTACAO_ERP_SABOR_DA_TERRA.pdf"


def main():
    if not MD_FILE.exists():
        print(f"Arquivo não encontrado: {MD_FILE}")
        return 1

    content = MD_FILE.read_text(encoding="utf-8")
    pdf = MarkdownPdf(toc_level=3, optimize=True)
    pdf.meta["title"] = "Documentação ERP Sabor da Terra"
    pdf.meta["author"] = "Lewio Consultoria e Desenvolvimento"
    pdf.add_section(Section(content))
    pdf.save(str(PDF_FILE))
    print(f"PDF gerado: {PDF_FILE}")
    return 0


if __name__ == "__main__":
    exit(main())
