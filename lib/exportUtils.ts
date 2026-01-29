import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import { Dream } from '@/types'

/**
 * Export dream as PDF with page-matching styles
 */
export async function exportDreamAsPDF(dream: Dream, elementId: string = 'dream-detail-content') {
  try {
    const element = document.getElementById(elementId)
    if (!element) {
      throw new Error('Dream detail element not found')
    }

    // Show loading indicator
    const loadingDiv = document.createElement('div')
    loadingDiv.id = 'pdf-loading'
    loadingDiv.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 9999; background: rgba(0,0,0,0.8); color: white; padding: 20px; border-radius: 10px;'
    loadingDiv.textContent = 'Generating PDF...'
    document.body.appendChild(loadingDiv)

    // Capture the element as canvas
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#0a0a0f',
      logging: false
    })

    // Calculate PDF dimensions
    const imgWidth = 210 // A4 width in mm
    const pageHeight = 297 // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width
    let heightLeft = imgHeight

    const pdf = new jsPDF('p', 'mm', 'a4')
    let position = 0

    // Add image to PDF (handle multiple pages if needed)
    const imgData = canvas.toDataURL('image/png')
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
    heightLeft -= pageHeight

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight
      pdf.addPage()
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight
    }

    // Save PDF
    const fileName = `dream_${dream.id}_${new Date(dream.timestamp).toISOString().split('T')[0]}.pdf`
    pdf.save(fileName)

    // Remove loading indicator
    document.body.removeChild(loadingDiv)
  } catch (error) {
    console.error('Error exporting PDF:', error)
    alert('Failed to export PDF. Please try again.')
  }
}

/**
 * Export dream as comprehensive Markdown with all data and images
 */
export async function exportDreamAsMarkdown(dream: Dream) {
  try {
    const date = new Date(dream.timestamp)
    const formattedDate = date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
    const formattedTime = date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })

    // Build comprehensive markdown content
    let markdown = `# Dream Journal Entry\n\n`
    markdown += `**Date:** ${formattedDate}\n`
    markdown += `**Time:** ${formattedTime}\n`
    markdown += `**Dream ID:** ${dream.id}\n\n`
    markdown += `---\n\n`

    // Main theme/title
    if (dream.analysis?.themes && dream.analysis.themes.length > 0) {
      markdown += `## ${dream.analysis.themes[0]}\n\n`
    }

    // Metadata section
    markdown += `### Metadata\n\n`
    markdown += `- **Mood:** ${dream.mood}\n`
    markdown += `- **Clarity:** ${'⭐'.repeat(dream.clarity)} (${dream.clarity}/5)\n`
    markdown += `- **Recurring:** ${dream.isRecurring ? 'Yes' : 'No'}\n`
    markdown += `- **Visibility:** ${dream.isPublic ? 'Public' : 'Private'}\n`
    if (dream.realityConnection) {
      markdown += `- **Reality Connection:** ${dream.realityConnection}\n`
    }
    markdown += `\n`

    // Dream image
    if (dream.imageUrl) {
      markdown += `### Dream Visualization\n\n`
      markdown += `![Dream Image](${dream.imageUrl})\n\n`
      markdown += `*AI-generated visualization based on dream content*\n\n`
    }

    // Original dream content
    markdown += `### Original Dream Entry\n\n`
    markdown += `${dream.content}\n\n`

    // AI Creative Story
    if (dream.analysis?.creativeStory) {
      markdown += `### AI Creative Interpretation\n\n`
      markdown += `> ${dream.analysis.creativeStory}\n\n`
    }

    // Emotional Analysis
    if (dream.analysis?.emotionalAnalysis) {
      markdown += `### Emotional Core Analysis\n\n`
      markdown += `${dream.analysis.emotionalAnalysis}\n\n`
    }

    // Themes
    if (dream.analysis?.themes && dream.analysis.themes.length > 0) {
      markdown += `### Identified Themes\n\n`
      dream.analysis.themes.forEach((theme, index) => {
        markdown += `${index + 1}. ${theme}\n`
      })
      markdown += `\n`
    }

    // Symbols
    if (dream.analysis?.symbols && dream.analysis.symbols.length > 0) {
      markdown += `### Dream Symbols\n\n`
      dream.analysis.symbols.forEach((symbol) => {
        markdown += `#### ${symbol.name}\n`
        markdown += `- **Type:** ${symbol.type}\n`
        markdown += `- **Meaning:** ${symbol.meaning}\n\n`
      })
    }

    // Footer
    markdown += `---\n\n`
    markdown += `*Exported from DreamWeaver on ${new Date().toLocaleDateString()}*\n`

    // Create and download file
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `dream_${dream.id}_${date.toISOString().split('T')[0]}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error('Error exporting Markdown:', error)
    alert('Failed to export Markdown. Please try again.')
  }
}
