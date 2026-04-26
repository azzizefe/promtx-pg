import React from 'react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({ currentPage, totalPages, onPageChange }) => {
  return (
    <div className="pagination" style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '20px' }}>
      <button 
        disabled={currentPage <= 1} 
        onClick={() => onPageChange(currentPage - 1)}
        style={{ padding: '8px 16px', borderRadius: '4px', border: '1px solid #ccc', background: currentPage <= 1 ? '#eee' : '#fff', cursor: currentPage <= 1 ? 'not-allowed' : 'pointer' }}
      >
        Previous
      </button>
      
      <span style={{ padding: '8px 16px' }}>
        Page {currentPage} of {totalPages}
      </span>
      
      <button 
        disabled={currentPage >= totalPages} 
        onClick={() => onPageChange(currentPage + 1)}
        style={{ padding: '8px 16px', borderRadius: '4px', border: '1px solid #ccc', background: currentPage >= totalPages ? '#eee' : '#fff', cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer' }}
      >
        Next
      </button>
    </div>
  );
};
