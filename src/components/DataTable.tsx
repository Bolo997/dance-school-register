import React, { useState, useMemo, useCallback } from 'react';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableSortLabel from '@mui/material/TableSortLabel';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Tooltip from '@mui/material/Tooltip';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DescriptionIcon from '@mui/icons-material/Description';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import { Column } from '../types';
import { useLocation } from 'react-router-dom';

interface DataTableProps {
  title: string;
  columns: Column[];
  data: any[];
  onAdd?: () => void;
  onEdit: (item: any) => void;
  onDelete?: (id: string) => void;
  onCopy?: (item: any) => void;
  onModulo?: (item: any) => void;
  emptyMessage?: string;
  renderCell?: (row: any, column: Column) => React.ReactNode;
}

type Order = 'asc' | 'desc';

const DataTable = React.memo<DataTableProps>(({
  title,
  columns,
  data,
  onAdd,
  onEdit,
  onDelete,
  onCopy,
  onModulo,
  emptyMessage = 'Nessun dato presente',
  renderCell
}) => {
  const { profile } = require('../contexts/AuthContext').useAuth();
  const [orderBy, setOrderBy] = useState<string>('');
  const [order, setOrder] = useState<Order>('asc');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [showFilters, setShowFilters] = useState(false);
  const location = useLocation();

  const handleRequestSort = useCallback((property: string) => {
    setOrder(prev => orderBy === property && prev === 'asc' ? 'desc' : 'asc');
    setOrderBy(property);
  }, [orderBy]);

  const handleFilterChange = useCallback((columnKey: string, value: string) => {
    setFilters(prev => ({ ...prev, [columnKey]: value }));
  }, []);

  const toggleFilters = useCallback(() => {
    setShowFilters(prev => !prev);
  }, []);

  const filteredAndSortedData = useMemo(() => {
    let result = [...data];

    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        result = result.filter(item => 
          String(item[key] || '').toLowerCase().includes(value.toLowerCase())
        );
      }
    });

    if (orderBy) {
      result.sort((a, b) => {
        const aValue = a[orderBy];
        const bValue = b[orderBy];
        if (aValue == null) return 1;
        if (bValue == null) return -1;
        const comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
        return order === 'asc' ? comparison : -comparison;
      });
    }

    return result;
  }, [data, filters, orderBy, order]);

  // Funzione per generare il tooltip delle azioni
  const getTooltipTitle = (item: any) => (
    <Box>
      {item.creato && (
        <Typography variant="caption" display="block">
          Creato da: {item.creato}
        </Typography>
      )}
      {item.modificato && (
        <Typography variant="caption" display="block">
          Modificato da: {item.modificato}
        </Typography>
      )}
      {!item.creato && !item.modificato && (
        <Typography variant="caption">Nessuna informazione</Typography>
      )}
    </Box>
  );

  // Funzione per generare le azioni
  const renderActions = (item: any) => {
    if (profile?.role === 'reader' || (profile.role === "contribute" && !location.pathname.includes("soci"))) return null;
    return (
      <Tooltip title={getTooltipTitle(item)} arrow placement="right">
        <Box sx={{ display: 'inline-flex' }}>
          <IconButton size="small" onClick={() => onEdit(item)}>
            <EditIcon fontSize="small" />
          </IconButton>
          {onCopy && (
            <IconButton size="small" onClick={() => onCopy(item)} title="Copia">
              <ContentCopyIcon fontSize="small" />
            </IconButton>
          )}
          {onModulo && (
            <IconButton size="small" onClick={() => onModulo(item)} title="Modulo Iscrizione">
              <DescriptionIcon fontSize="small" />
            </IconButton>
          )}
          {onDelete && (
            <IconButton size="small" onClick={() => onDelete(item.id)}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          )}
        </Box>
      </Tooltip>
    );
  };

  // Funzione per generare le celle
  const renderCells = (item: any) => (
    columns.map((col, i) => {
      const customContent = renderCell ? renderCell(item, col) : undefined;
      return (
        <TableCell key={`cell-${item.id}-${i}-${col.key}`} sx={{ 
          py: 0.10, 
          width: col.width || 'auto', 
          minWidth: col.width || 'auto',
          maxWidth: col.width || 'auto',
          wordBreak: 'break-word'
        }}>
          {customContent !== undefined 
            ? customContent 
            : (col.format ? col.format(item[col.key]) : item[col.key])}
        </TableCell>
      );
    })
  );

  return (
    <Paper elevation={3} sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" component="h2">
          {title}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <IconButton
            onClick={toggleFilters}
            color={showFilters ? 'primary' : 'default'}
            title="Mostra/Nascondi filtri"
          >
            <FilterAltIcon />
          </IconButton>
          {onAdd && (profile?.role === 'admin' || (profile.role === "contribute" && location.pathname.includes("soci"))) && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={onAdd}>
              Aggiungi
            </Button>
          )}
        </Box>
      </Box>

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: '100px' }}></TableCell>
              {columns.map((col, i) => (
                <TableCell key={`head-${i}-${col.key}`} sx={{ 
                  width: col.width || 'auto', 
                  minWidth: col.width || 'auto',
                  maxWidth: col.width || 'auto'
                }}>
                  <TableSortLabel
                    active={orderBy === col.key}
                    direction={orderBy === col.key ? order : 'asc'}
                    onClick={() => handleRequestSort(col.key)}
                  >
                    {col.label}
                  </TableSortLabel>
                </TableCell>
              ))}
            </TableRow>
            {showFilters && (
              <TableRow>
                <TableCell />
                {columns.map((col, i) => (
                  <TableCell key={`filter-${i}-${col.key}`} sx={{ py: 0.5 }}>
                    <TextField
                      size="small"
                      placeholder={`Filtra ${col.label.toLowerCase()}...`}
                      value={filters[col.key] || ''}
                      onChange={(e) => handleFilterChange(col.key, e.target.value)}
                      sx={{ width: '100%' }}
                      variant="outlined"
                    />
                  </TableCell>
                ))}
              </TableRow>
            )}
          </TableHead>
          <TableBody>
            {filteredAndSortedData.map((item) => (
              <TableRow key={item.id} sx={{ height: '32px' }}>
                <TableCell sx={{ py: 0.25, whiteSpace: 'nowrap', width: '100px', maxWidth: '100px' }}>
                  {renderActions(item)}
                </TableCell>
                {renderCells(item)}
              </TableRow>
            ))}
            {filteredAndSortedData.length === 0 && (
              <TableRow>
                <TableCell colSpan={columns.length + 1} align="center">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
});

DataTable.displayName = 'DataTable';

export default DataTable;
