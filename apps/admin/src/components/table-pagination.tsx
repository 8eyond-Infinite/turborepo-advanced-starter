import React from 'react';
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from './ui/pagination';

interface TablePaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    className?: string;
}

export const TablePagination = ({
    currentPage,
    totalPages,
    onPageChange,
    className = '',
}: TablePaginationProps) => {
    if (totalPages <= 1) return null;

    const getPageNumbers = () => {
        const pages: (number | 'ellipsis')[] = [];
        const maxVisible = 5;

        if (totalPages <= maxVisible) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            // First page
            pages.push(1);

            // Ellipsis or page 2
            if (currentPage > 3) {
                pages.push('ellipsis');
            } else if (currentPage === 3) {
                pages.push(2);
            }

            // Current range
            const start = Math.max(currentPage === totalPages ? currentPage - 2 : currentPage - 1, 2);
            const end = Math.min(currentPage === 1 ? currentPage + 2 : currentPage + 1, totalPages - 1);

            for (let i = start; i <= end; i++) {
                if (!pages.includes(i)) {
                    pages.push(i);
                }
            }

            // Ellipsis or second-to-last page
            if (currentPage < totalPages - 2) {
                pages.push('ellipsis');
            } else if (currentPage === totalPages - 2) {
                pages.push(totalPages - 1);
            }

            // Last page
            if (!pages.includes(totalPages)) {
                pages.push(totalPages);
            }
        }
        return pages;
    };

    const handlePrev = (e: React.MouseEvent) => {
        e.preventDefault();
        if (currentPage > 1) {
            onPageChange(currentPage - 1);
        }
    };

    const handleNext = (e: React.MouseEvent) => {
        e.preventDefault();
        if (currentPage < totalPages) {
            onPageChange(currentPage + 1);
        }
    };

    const handlePageClick = (page: number) => (e: React.MouseEvent) => {
        e.preventDefault();
        onPageChange(page);
    };

    return (
        <Pagination className={`flex justify-center md:justify-end py-4 px-6 border-t border-border/40 bg-muted/5 ${className}`}>
            <PaginationContent>
                <PaginationItem>
                    <PaginationPrevious
                        href="#"
                        onClick={handlePrev}
                        className={currentPage === 1 ? 'pointer-events-none opacity-40' : 'cursor-pointer'}
                        text="Trước"
                    />
                </PaginationItem>

                {getPageNumbers().map((page, idx) => (
                    <PaginationItem key={idx}>
                        {page === 'ellipsis' ? (
                            <PaginationEllipsis />
                        ) : (
                            <PaginationLink
                                href="#"
                                isActive={page === currentPage}
                                onClick={handlePageClick(page)}
                                className="cursor-pointer"
                            >
                                {page}
                            </PaginationLink>
                        )}
                    </PaginationItem>
                ))}

                <PaginationItem>
                    <PaginationNext
                        href="#"
                        onClick={handleNext}
                        className={currentPage === totalPages ? 'pointer-events-none opacity-40' : 'cursor-pointer'}
                        text="Sau"
                    />
                </PaginationItem>
            </PaginationContent>
        </Pagination>
    );
};
