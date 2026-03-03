import React, { useState } from 'react'
import { motion } from 'framer-motion'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import HierarchyTree from './HierarchyTree'

const SAMPLE_DATA = [
  // United States - In-Store
  { Country: 'United States', Channel: 'In-Store', MID: '4000100001' },
  { Country: 'United States', Channel: 'In-Store', MID: '4000100002' },
  { Country: 'United States', Channel: 'In-Store', MID: '4000100003' },
  { Country: 'United States', Channel: 'In-Store', MID: '4000100004' },
  { Country: 'United States', Channel: 'In-Store', MID: '4000100005' },
  // United States - Online
  { Country: 'United States', Channel: 'Online', MID: '4000100101' },
  { Country: 'United States', Channel: 'Online', MID: '4000100102' },
  // Canada - In-Store
  { Country: 'Canada', Channel: 'In-Store', MID: '4000200001' },
  { Country: 'Canada', Channel: 'In-Store', MID: '4000200002' },
  { Country: 'Canada', Channel: 'In-Store', MID: '4000200003' },
  // Canada - Online
  { Country: 'Canada', Channel: 'Online', MID: '4000200101' },
  { Country: 'Canada', Channel: 'Online', MID: '4000200102' },
  // United Kingdom - In-Store
  { Country: 'United Kingdom', Channel: 'In-Store', MID: '4000300001' },
  { Country: 'United Kingdom', Channel: 'In-Store', MID: '4000300002' },
  { Country: 'United Kingdom', Channel: 'In-Store', MID: '4000300003' },
  // United Kingdom - Online
  { Country: 'United Kingdom', Channel: 'Online', MID: '4000300101' },
  { Country: 'United Kingdom', Channel: 'Online', MID: '4000300102' },
  // Germany - In-Store
  { Country: 'Germany', Channel: 'In-Store', MID: '4000400001' },
  { Country: 'Germany', Channel: 'In-Store', MID: '4000400002' },
  { Country: 'Germany', Channel: 'In-Store', MID: '4000400003' },
  // Germany - Online
  { Country: 'Germany', Channel: 'Online', MID: '4000400101' },
  { Country: 'Germany', Channel: 'Online', MID: '4000400102' },
  // Australia - In-Store
  { Country: 'Australia', Channel: 'In-Store', MID: '4000500001' },
  { Country: 'Australia', Channel: 'In-Store', MID: '4000500002' },
  // Australia - Online
  { Country: 'Australia', Channel: 'Online', MID: '4000500101' },
]

function App() {
  const [parsedData, setParsedData] = useState([])
  const [columns, setColumns] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [columnMappings, setColumnMappings] = useState({
    levels: [''], // Initialize with level 1 already showing
    midColumn: undefined,
    levelAliases: {}
  })
  // Active mappings used for visualization (only updated when Generate Visualization is clicked)
  const [activeMappings, setActiveMappings] = useState({
    levels: [],
    midColumn: undefined,
    levelAliases: {}
  })
  const [isSampleData, setIsSampleData] = useState(false)
  const [companyName, setCompanyName] = useState('')

  const handleLoadSampleData = () => {
    const sampleColumns = Object.keys(SAMPLE_DATA[0])
    const sampleMappings = { levels: ['Country', 'Channel'], midColumn: 'MID', levelAliases: {} }
    setParsedData(SAMPLE_DATA)
    setColumns(sampleColumns)
    setColumnMappings(sampleMappings)
    setActiveMappings(sampleMappings)
    setCompanyName('Acme Inc.')
    setError('')
    setIsSampleData(true)
  }

  const applyParsedData = (data) => {
    setParsedData(data)
    const newColumns = Object.keys(data[0] || {})
    setColumns(newColumns)
    const autoDetectedMapping = autoDetectColumns(newColumns, data)
    setColumnMappings(autoDetectedMapping)
    setActiveMappings({ levels: [], midColumn: undefined, levelAliases: {} })
    setCompanyName('')
    setIsSampleData(false)
    setIsLoading(false)
  }

  const handleFileUpload = (event) => {
    const file = event.target.files[0]
    if (!file) return

    setIsLoading(true)
    setError('')

    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls')

    if (isExcel) {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const workbook = XLSX.read(e.target.result, { type: 'array' })
          const sheet = workbook.Sheets[workbook.SheetNames[0]]
          const data = XLSX.utils.sheet_to_json(sheet, { defval: '' })
          if (!data.length) {
            setError('The Excel file appears to be empty.')
            setIsLoading(false)
            return
          }
          applyParsedData(data)
        } catch (err) {
          setError(`Excel parsing error: ${err.message}`)
          setIsLoading(false)
        }
      }
      reader.onerror = () => {
        setError('File reading error.')
        setIsLoading(false)
      }
      reader.readAsArrayBuffer(file)
    } else {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.errors.length > 0) {
            setError(`CSV parsing error: ${results.errors[0].message}`)
            setIsLoading(false)
            return
          }
          applyParsedData(results.data)
        },
        error: (err) => {
          setError(`File reading error: ${err.message}`)
          setIsLoading(false)
        }
      })
    }
  }

  const handleDrop = (event) => {
    event.preventDefault()
    const files = event.dataTransfer.files
    if (files.length > 0) {
      const file = files[0]
      const accepted = file.type === 'text/csv' || file.name.endsWith('.csv') ||
        file.name.endsWith('.xlsx') || file.name.endsWith('.xls')
      if (accepted) {
        const fakeEvent = { target: { files: [file] } }
        handleFileUpload(fakeEvent)
      } else {
        setError('Please upload a CSV or Excel file (.csv, .xlsx, .xls)')
      }
    }
  }

  const handleDragOver = (event) => {
    event.preventDefault()
  }

  const handleColumnMappingChange = (mappingType, value) => {
    if (mappingType === 'levels') {
      setColumnMappings(prev => ({
        ...prev,
        levels: value
      }))
    } else if (mappingType === 'midColumn') {
      setColumnMappings(prev => ({
        ...prev,
        midColumn: value || undefined
      }))
    }
  }

  const addLevel = () => {
    setColumnMappings(prev => {
      // Limit to maximum 3 levels
      if (prev.levels.length >= 3) {
        return prev
      }
      return {
        ...prev,
        levels: [...prev.levels, '']
      }
    })
  }

  const removeLevel = (index) => {
    setColumnMappings(prev => {
      // Don't allow removing the last level - always keep at least level 1
      if (prev.levels.length <= 1) {
        return prev
      }
      return {
        ...prev,
        levels: prev.levels.filter((_, i) => i !== index)
      }
    })
  }

  const updateLevel = (index, value) => {
    setColumnMappings(prev => ({
      ...prev,
      levels: prev.levels.map((level, i) => i === index ? value : level)
    }))
  }

  const updateLevelAlias = (levelName, alias) => {
    setColumnMappings(prev => ({
      ...prev,
      levelAliases: {
        ...prev.levelAliases,
        [levelName]: alias
      }
    }))
  }

  // Check for duplicate selections
  const hasDuplicateSelections = () => {
    const { levels, midColumn } = columnMappings
    const allSelections = [...levels.filter(Boolean), midColumn].filter(Boolean)
    return allSelections.length !== new Set(allSelections).size
  }

  // Check if midColumn is also selected as a level
  const isMidColumnInLevels = () => {
    const { levels, midColumn } = columnMappings
    return midColumn && levels.includes(midColumn)
  }

  // Check for duplicate aliases
  const getDuplicateAliases = () => {
    const { levelAliases } = columnMappings
    const aliasValues = Object.values(levelAliases).filter(Boolean)
    const duplicates = aliasValues.filter((alias, index) => 
      aliasValues.indexOf(alias) !== index
    )
    return [...new Set(duplicates)]
  }

  const autoDetectColumns = (columns, data) => {
    // Simple auto-detection: use first column as default level
    // In a real implementation, this could be more sophisticated
    // Always ensure at least level 1 exists (empty if no columns, or first column if available)
    const defaultLevels = columns.length > 0 ? [columns[0]] : ['']
    
    return {
      levels: defaultLevels,
      midColumn: undefined,
      levelAliases: {}
    }
  }

  // Generic hierarchy builder
  const buildHierarchy = (rows, levels, midColumn) => {
    if (!rows || rows.length === 0 || !midColumn) return []
    
    // Group rows by the first level
    const groups = {}
    rows.forEach(row => {
      const firstLevelValue = String(row[levels[0]] ?? '').trim() || '—'
      if (!groups[firstLevelValue]) {
        groups[firstLevelValue] = []
      }
      groups[firstLevelValue].push(row)
    })
    
    // Process each group
    const nodes = Object.entries(groups).map(([groupName, groupRows]) => {
      if (levels.length === 1) {
        // This is a leaf node - use midColumn for MIDs
        const mids = [...new Set(groupRows.map(row => String(row[midColumn] ?? '').trim()).filter(Boolean))]
        return {
          name: groupName,
          mids: mids,
          count: mids.length
        }
      } else {
        // Recurse with remaining levels
        const childNodes = buildHierarchy(groupRows, levels.slice(1), midColumn)
        const totalCount = childNodes.reduce((sum, child) => sum + (child.count || 0), 0)
        
        return {
          name: groupName,
          children: childNodes,
          count: totalCount
        }
      }
    })
    
    // Sort alphabetically by name
    return nodes.sort((a, b) => a.name.localeCompare(b.name))
  }

  // Validation functions
  const validateMapping = () => {
    const errors = []
    const warnings = []
    
    // Check for required levels - at least one level must have a selected value
    const levelsWithValues = columnMappings.levels.filter(level => level && level.trim() !== '')
    if (levelsWithValues.length === 0) {
      errors.push('Select at least one level.')
    }
    
    // Check for maximum levels
    if (columnMappings.levels.length > 3) {
      errors.push('Maximum of 3 hierarchy levels allowed.')
    }
    
    // Check for required MID column
    if (!columnMappings.midColumn) {
      errors.push('MID Column is required.')
    }
    
    // Check for duplicates
    if (hasDuplicateSelections()) {
      errors.push('Duplicate headers across levels or with MID.')
    }
    
    // Check for duplicate aliases
    const duplicateAliases = getDuplicateAliases()
    if (duplicateAliases.length > 0) {
      warnings.push(`Duplicate alias names may cause confusion in preview: ${duplicateAliases.join(', ')}.`)
    }
    
    // Check for empty values
    if (parsedData.length > 0 && columnMappings.levels.length > 0 && columnMappings.midColumn) {
      const emptyValueCounts = {}
      // Only check levels that have values selected
      columnMappings.levels.filter(level => level && level.trim() !== '').forEach(level => {
        const emptyCount = parsedData.filter(row => !String(row[level] ?? '').trim()).length
        if (emptyCount > 0) {
          emptyValueCounts[level] = emptyCount
        }
      })
      
      // Always check MID column since it's required
      const emptyMidCount = parsedData.filter(row => !String(row[columnMappings.midColumn] ?? '').trim()).length
      if (emptyMidCount > 0) {
        emptyValueCounts[columnMappings.midColumn] = emptyMidCount
      }
      
      Object.entries(emptyValueCounts).forEach(([column, count]) => {
        warnings.push(`${count} rows missing ${column}; grouped under '—'.`)
      })
    }
    
    return { errors, warnings }
  }

  // Memoize hierarchy data to prevent unnecessary re-renders
  // Uses activeMappings instead of columnMappings so it only updates when Generate Visualization is clicked
  const memoizedHierarchyData = React.useMemo(() => {
    if (!parsedData.length || activeMappings.levels.length === 0 || !activeMappings.midColumn) {
      return null
    }
    
    // Build hierarchy using new function
    const hierarchyNodes = buildHierarchy(
      parsedData,
      activeMappings.levels,
      activeMappings.midColumn
    )
    
    // Wrap with virtual root node
    const totalCount = hierarchyNodes.reduce((sum, node) => sum + (node.count || 0), 0)
    return {
      name: 'All Accounts',
      children: hierarchyNodes,
      count: totalCount
    }
  }, [parsedData, activeMappings.levels, activeMappings.midColumn])

  const handleGenerateVisualization = () => {
    const levelsWithValues = columnMappings.levels.filter(level => level && level.trim() !== '')
    if (!parsedData.length || levelsWithValues.length === 0) {
      return
    }
    
    const validation = validateMapping()
    if (validation.errors.length > 0) {
      setError(validation.errors.join(' '))
      return
    }
    
    // Clear previous errors
    setError('')
    
    // Update active mappings to trigger visualization update
    setActiveMappings({
      levels: [...columnMappings.levels],
      midColumn: columnMappings.midColumn,
      levelAliases: { ...columnMappings.levelAliases }
    })
    
    console.log('Validation warnings:', validation.warnings)
  }

  return (
    <div className="min-h-screen bg-gray-50 font-inter">
      {/* Main Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <motion.h1 
              className="text-3xl font-semibold text-gray-900"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              Pagos Hierarchy Visualizer
            </motion.h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="bg-gray-50 min-h-[calc(100vh-120px)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <motion.div
            className="grid grid-cols-1 lg:grid-cols-2 gap-8 min-h-[600px]"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
          {/* Left Column - Input Panel */}
          <motion.div
            className="bg-gray-100 rounded-2xl shadow-lg border border-gray-200 p-6 flex flex-col sticky top-8 self-start max-h-[calc(100vh-6rem)] overflow-y-auto"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <div className="flex flex-col h-full">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Input Panel</h2>
                <p className="text-sm text-gray-600">Upload and configure your hierarchical data</p>
              </div>
              
              {/* File Upload Section */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-3">File Upload</h3>
                <div 
                  className="border-2 border-dashed border-gray-300 rounded-2xl p-6 text-center hover:border-blue-400 hover:bg-blue-50 transition-all duration-200 cursor-pointer"
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onClick={() => document.getElementById('csv-upload').click()}
                >
                  <input
                    id="csv-upload"
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  
                  {isLoading ? (
                    <div className="flex flex-col items-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-3"></div>
                      <p className="text-sm text-gray-600">Parsing CSV...</p>
                    </div>
                  ) : (
                    <>
                      <svg className="w-8 h-8 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                      </svg>
                      <p className="text-sm text-gray-600 mb-2">Drop your file here or click to browse</p>
                      <p className="text-xs text-gray-500">Supports .csv, .xlsx, .xls up to 10MB</p>
                      <div className="mt-3 flex items-center gap-2">
                        <div className="flex-1 h-px bg-gray-200"></div>
                        <span className="text-xs text-gray-400">or</span>
                        <div className="flex-1 h-px bg-gray-200"></div>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleLoadSampleData() }}
                        className="mt-3 text-xs font-medium text-blue-600 hover:text-blue-800 underline underline-offset-2"
                      >
                        load sample data
                      </button>
                    </>
                  )}
                </div>
                
                {isSampleData && (
                  <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-2">
                    <svg className="w-4 h-4 text-amber-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-xs text-amber-700">Demo data loaded — upload a CSV to replace it</p>
                  </div>
                )}

                {error && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-2xl">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}
              </div>
              
              {/* Data Preview Section */}
              {parsedData.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Data Preview</h3>
                  <div className="bg-white rounded-2xl p-4 max-h-48 overflow-auto shadow-sm border border-gray-200">
                    <div className="text-xs text-gray-500 mb-2">
                      Showing first 5 rows of {parsedData.length} total rows
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-gray-300">
                            {columns.map((column, index) => (
                              <th key={index} className="text-left py-1 px-2 font-medium text-gray-700">
                                {column}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {parsedData.slice(0, 5).map((row, rowIndex) => (
                            <tr key={rowIndex} className="border-b border-gray-200">
                              {columns.map((column, colIndex) => (
                                <td key={colIndex} className="py-1 px-2 text-gray-600">
                                  {row[column] || '-'}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Column Mapping Section */}
              <div className="flex-1">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Column Mapping</h3>
                
                {/* Hierarchy Levels Section */}
                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-gray-600">
                      Hierarchy Levels
                      <span className="ml-2 text-gray-400">
                        ({columnMappings.levels.length}/3)
                      </span>
                    </label>
                    <button
                      onClick={addLevel}
                      disabled={columnMappings.levels.length >= 3}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all duration-200 shadow-sm ${
                        columnMappings.levels.length >= 3
                          ? 'text-gray-400 bg-gray-100 border-gray-200 cursor-not-allowed'
                          : 'text-blue-600 bg-blue-50 hover:bg-blue-100 hover:text-blue-700 border-blue-200 hover:border-blue-300 hover:shadow-md'
                      }`}
                      title={columnMappings.levels.length >= 3 ? 'Maximum of 3 levels allowed' : 'Add Level'}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add Level
                    </button>
                  </div>
                  
                  {columnMappings.levels.map((level, index) => {
                    // Get available columns (exclude already selected ones and midColumn)
                    const availableColumns = columns.filter(col => {
                      const isSelectedInOtherLevels = columnMappings.levels.some((l, i) => i !== index && l === col)
                      const isMidColumn = col === columnMappings.midColumn
                      return !isSelectedInOtherLevels && !isMidColumn
                    })
                    
                    return (
                      <div key={index} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200">
                        <div className="space-y-3">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-medium text-gray-500 w-8">Level {index + 1}</span>
                            <select 
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              value={level}
                              onChange={(e) => updateLevel(index, e.target.value)}
                            >
                              <option value="">Select column...</option>
                              {availableColumns.map((column, colIndex) => (
                                <option key={colIndex} value={column}>{column}</option>
                              ))}
                            </select>
                            {columnMappings.levels.length > 1 && (
                              <button
                                onClick={() => removeLevel(index)}
                                className="text-red-500 hover:text-red-700 p-1"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            )}
                          </div>
                          
                          {/* Alias Input - Hidden */}
                          <div className="hidden flex items-center space-x-2">
                            <span className="text-xs font-medium text-gray-500 w-8">Alias</span>
                            <input
                              type="text"
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="Alias (optional)"
                              value={columnMappings.levelAliases[level] || ''}
                              onChange={(e) => updateLevelAlias(level, e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* MID Column Mapping */}
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200">
                  <label className="block text-xs font-medium text-gray-600 mb-2">
                    MID Column <span className="text-red-500">*</span>
                  </label>
                  <select 
                    className={`w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-transparent ${
                      isMidColumnInLevels() 
                        ? 'border-red-300 focus:ring-red-500' 
                        : !columnMappings.midColumn
                        ? 'border-red-300 focus:ring-red-500'
                        : 'border-gray-300 focus:ring-blue-500'
                    }`}
                    value={columnMappings.midColumn || ''}
                    onChange={(e) => handleColumnMappingChange('midColumn', e.target.value)}
                    required
                  >
                    <option value="">Select MID column...</option>
                    {columns
                      .filter(col => !columnMappings.levels.includes(col))
                      .map((column, index) => (
                        <option key={index} value={column}>{column}</option>
                      ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    The MID column is required for the hierarchy visualization.
                  </p>
                  {isMidColumnInLevels() && (
                    <p className="text-xs text-red-600 mt-1">
                      A header cannot be both a level and MID.
                    </p>
                  )}
                  {!columnMappings.midColumn && parsedData.length > 0 && (
                    <p className="text-xs text-red-600 mt-1">
                      Please select a MID column.
                    </p>
                  )}
                </div>
                
                {/* Mapping Status */}
                {parsedData.length > 0 && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-2xl border border-blue-200">
                    <h4 className="text-xs font-medium text-blue-800 mb-2">Current Mappings:</h4>
                    <div className="text-xs text-blue-700 space-y-1">
                      <div>
                        <span className="font-medium">Levels:</span> [
                        {columnMappings.levels.length > 0 
                          ? columnMappings.levels.map(level => {
                              const alias = columnMappings.levelAliases[level]
                              return alias ? `${level} → ${alias}` : level
                            }).join(' > ')
                          : 'None selected'
                        }]
                      </div>
                      <div>
                        <span className="font-medium">MID:</span> {
                          columnMappings.midColumn 
                            ? columnMappings.midColumn 
                            : 'Not selected'
                        }
                      </div>
                      {hasDuplicateSelections() && (
                        <div className="text-red-600 font-medium">
                          ⚠️ Duplicate selections detected
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Validation Messages */}
                {parsedData.length > 0 && (() => {
                  const validation = validateMapping()
                  return (
                    <div className="mt-4 space-y-2">
                      {validation.errors.length > 0 && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-2xl">
                          <div className="text-sm text-red-800 font-medium mb-1">Errors:</div>
                          {validation.errors.map((error, index) => (
                            <div key={index} className="text-sm text-red-700">• {error}</div>
                          ))}
                        </div>
                      )}
                      {validation.warnings.length > 0 && (
                        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-2xl">
                          <div className="text-sm text-yellow-800 font-medium mb-1">Warnings:</div>
                          {validation.warnings.map((warning, index) => (
                            <div key={index} className="text-sm text-yellow-700">• {warning}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })()}

                {/* Company Name */}
                <div className="mt-4 bg-white rounded-2xl p-4 shadow-sm border border-gray-200">
                  <label className="block text-xs font-medium text-gray-600 mb-2">
                    Company / DBA Name
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g. Acme Inc."
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Appears as the root label in the hierarchy.
                  </p>
                </div>

                <div className="mt-6">
                  <button
                    className={`w-full py-3 px-4 rounded-2xl text-sm font-medium transition-all duration-200 shadow-sm ${
                      parsedData.length > 0 && columnMappings.levels.filter(level => level && level.trim() !== '').length > 0 && columnMappings.midColumn && !hasDuplicateSelections() && !isMidColumnInLevels()
                        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl' 
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                    disabled={parsedData.length === 0 || columnMappings.levels.filter(level => level && level.trim() !== '').length === 0 || !columnMappings.midColumn || hasDuplicateSelections() || isMidColumnInLevels()}
                    onClick={handleGenerateVisualization}
                  >
                    Generate Visualization
                  </button>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right Column - Hierarchy Preview */}
          <motion.div
            className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 flex flex-col"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <div className="flex flex-col h-full">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Hierarchy Preview</h2>
                <p className="text-sm text-gray-600">Interactive visualization of your data</p>
              </div>
              
              {/* Visualization Container */}
              <div className="flex-1 border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                {activeMappings.levels.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-gray-400">
                    <div className="text-center">
                      <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      <p className="text-sm">Click "Generate Visualization" to see the hierarchy</p>
                    </div>
                  </div>
                ) : (
                  <HierarchyTree
                    key={`hierarchy-${JSON.stringify(activeMappings.levels)}-${activeMappings.midColumn}`}
                    hierarchyData={memoizedHierarchyData}
                    companyName={companyName}
                  />
                )}
              </div>
            </div>
          </motion.div>
          </motion.div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-center items-center">
            <p className="text-sm text-gray-500">
              Built for <span className="font-semibold text-gray-700">Pagos</span>
            </p>
          </div>
        </div>
      </footer>

    </div>
  )
}

export default App
