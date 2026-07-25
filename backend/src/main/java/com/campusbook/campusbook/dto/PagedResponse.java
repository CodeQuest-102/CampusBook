package com.campusbook.campusbook.dto;

import org.springframework.data.domain.Page;

import java.util.List;
import java.util.function.Function;

/**
 * A stable, framework-agnostic pagination envelope for list endpoints. Spring's
 * own {@code Page} serializes with a large, unstable shape; this exposes only the
 * fields a client needs, so the JSON contract doesn't shift with Spring versions.
 */
public record PagedResponse<T>(
        List<T> content,
        int page,
        int size,
        long totalElements,
        int totalPages,
        boolean last
) {
    /** Map a {@code Page} of entities to a {@code PagedResponse} of DTOs. */
    public static <E, D> PagedResponse<D> from(Page<E> page, Function<E, D> mapper) {
        return new PagedResponse<>(
                page.getContent().stream().map(mapper).toList(),
                page.getNumber(),
                page.getSize(),
                page.getTotalElements(),
                page.getTotalPages(),
                page.isLast()
        );
    }
}
