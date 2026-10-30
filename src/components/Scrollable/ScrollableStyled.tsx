import React, {useCallback, useEffect, useId, useImperativeHandle, useRef, useState} from 'react';
import {interval} from 'rxjs';
import {browser} from 'utils';
import useBaseFontSize from 'hooks/useBaseFontSize';
import useOnResize, {ResizeRect} from 'hooks/useOnResize';
import usePrevious from 'hooks/usePrevious';
import {ScrollableProps} from './Scrollable';
import Scrollbar, {ScrollbarHandle} from './Scrollbar';
import useScrollableComponents from './useScrollableComponents';
import './ScrollableStyled.scss';

interface Overflow {
    x: boolean;
    y: boolean;
}

export default function ScrollableStyled({
    children,
    scrollWidth = 0,
    scrollHeight = 0,
    autoscroll,
    onResize,
    onScroll,
    ref,
    ...props
}: ScrollableProps) {
    const scrollableId = useId();
    const [head, body] = useScrollableComponents(children);
    const containerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const headRef = useRef<HTMLDivElement>(null);
    const bodyContentRef = useRef<HTMLDivElement>(null);
    const hScrollbarRef = useRef<ScrollbarHandle>(null);
    const vScrollbarRef = useRef<ScrollbarHandle>(null);
    const baseFontSize = useBaseFontSize();
    const {
        lineHeight = baseFontSize,
        scrollAmountY = lineHeight,
        scrollAmountX = scrollAmountY,
    } = props;
    const [scrollbarSize, setScrollbarSize] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);
    const [scrollTop, setScrollTop] = useState(0);
    const [scrollRect, setScrollRect] = useState<ResizeRect>(() => ({
        width: scrollWidth,
        height: scrollHeight,
    }));
    const [innerRect, setInnerRect] = useState<ResizeRect>(() => ({width: 0, height: 0}));
    const [clientRect, setClientRect] = useState<ResizeRect>(() => ({width: 0, height: 0}));
    const [overflow, setOverflow] = useState<Overflow>({x: false, y: false});
    const [dragOver, setDragOver] = useState(0);
    const prevLineHeight = usePrevious(lineHeight);

    useImperativeHandle(ref, () => ({
        scrollTo: ({left, top}) => {
            if (left !== undefined) {
                hScrollbarRef.current!.scrollTo(left);
            }
            if (top !== undefined) {
                vScrollbarRef.current!.scrollTo(top);
            }
        },
        get scrollTop() {
            return parseFloat(bodyContentRef.current!.dataset.scrollTop!);
        },
    }));

    useEffect(() => {
        const innerWidth = innerRect.width;
        const innerHeight = innerRect.height;
        const scrollWidth = scrollRect.width;
        const scrollHeight = scrollRect.height;
        let clientWidth = innerWidth;
        let overflowX = innerWidth ? scrollWidth - innerWidth > 1 : false;
        const clientHeight = Math.max(innerHeight - (overflowX ? scrollbarSize : 0), 0);
        const overflowY = innerHeight ? scrollHeight - clientHeight > 1 : false;
        if (overflowY) {
            clientWidth = Math.max(innerWidth - scrollbarSize, 0);
            overflowX = scrollWidth - clientWidth > 1;
        }
        setClientRect((clientRect) => {
            const height = clientHeight;
            const width = clientWidth;
            return clientRect.width !== width || clientRect.height !== height
                ? {width, height}
                : clientRect;
        });
        setOverflow((overflow) => {
            return overflow.x !== overflowX || overflow.y !== overflowY
                ? {x: overflowX, y: overflowY}
                : overflow;
        });
    }, [innerRect, scrollRect, scrollbarSize]);

    useEffect(() => {
        setScrollRect((scrollRect) => {
            const width = scrollWidth || contentRef.current!.scrollWidth;
            const height = scrollHeight || contentRef.current!.scrollHeight;
            return scrollRect.width !== width || scrollRect.height !== height
                ? {width, height}
                : scrollRect;
        });
    }, [scrollWidth, scrollHeight]);

    useEffect(() => {
        const clientWidth = clientRect.width;
        const clientHeight = clientRect.height;
        const scrollWidth = scrollRect.width;
        const scrollHeight = scrollRect.height;
        onResize?.({clientWidth, clientHeight, scrollWidth, scrollHeight});
    }, [clientRect, scrollRect, onResize]);

    useEffect(() => {
        // Restore scroll position after `lineHeight` change.
        if (prevLineHeight && prevLineHeight !== lineHeight) {
            vScrollbarRef.current?.scrollTo(scrollTop * (lineHeight / prevLineHeight));
        }
    }, [lineHeight, prevLineHeight, scrollTop]);

    const onContainerResize = useCallback(({width, height}: ResizeRect) => {
        setInnerRect((innerRect) => {
            return width * height > 0 && (innerRect.width !== width || innerRect.height !== height)
                ? {width, height}
                : innerRect;
        });
    }, []);

    const onBodyContentResize = useCallback(() => {
        setScrollRect((scrollRect) => {
            const width =
                scrollWidth === 0 ? bodyContentRef.current!.scrollWidth : scrollRect.width;
            const height =
                scrollHeight === 0
                    ? bodyContentRef.current!.scrollHeight + (headRef.current?.clientHeight || 0)
                    : scrollRect.height;
            return height > 0 && (scrollRect.width !== width || scrollRect.height !== height)
                ? {width, height}
                : scrollRect;
        });
    }, [scrollWidth, scrollHeight]);

    useOnResize(containerRef, onContainerResize);
    useOnResize(bodyContentRef, onBodyContentResize);

    useEffect(() => {
        onScroll?.({left: scrollLeft, top: scrollTop});
    }, [scrollLeft, scrollTop, onScroll]);

    useEffect(() => {
        const container = containerRef.current;
        const handleWheel = (event: WheelEvent) => {
            if (!event[browser.cmdKey]) {
                event.preventDefault();
                const hScrollbar = hScrollbarRef.current!;
                const vScrollbar = vScrollbarRef.current!;
                if (!hScrollbar.atStart() && event.deltaX < 0) {
                    event.stopPropagation();
                    hScrollbar.scrollBy(event.deltaX);
                } else if (!hScrollbar.atEnd() && event.deltaX > 0) {
                    event.stopPropagation();
                    hScrollbar.scrollBy(event.deltaX);
                }
                if (!vScrollbar.atStart() && event.deltaY < 0) {
                    event.stopPropagation();
                    vScrollbar.scrollBy(event.deltaY);
                } else if (!vScrollbar.atEnd() && event.deltaY > 0) {
                    event.stopPropagation();
                    vScrollbar.scrollBy(event.deltaY);
                }
            }
        };
        container?.addEventListener('wheel', handleWheel, {passive: false});
        return () => container?.removeEventListener('wheel', handleWheel);
    }, []);

    const handleDragOver = useCallback(
        (event: React.DragEvent) => {
            const offsetTop = containerRef.current!.getBoundingClientRect().top;
            const offsetY = event.clientY - offsetTop;
            if (offsetY + (overflow.x ? 2 : 1) * lineHeight > innerRect.height) {
                setDragOver(lineHeight);
            } else if (offsetY < (overflow.x ? 2 : 1) * lineHeight) {
                setDragOver(-lineHeight);
            }
        },
        [innerRect, lineHeight, overflow]
    );

    useEffect(() => {
        if (dragOver) {
            const scroll = () => vScrollbarRef.current!.scrollBy(dragOver);
            const interval$ = interval(100);
            const subscription = interval$.subscribe(scroll);
            return () => subscription.unsubscribe();
        }
    }, [dragOver]);

    const cancelDragOver = useCallback(() => setDragOver(0), []);

    return (
        <div
            className={`scrollable scrollable-styled ${overflow.x ? 'overflow-x' : ''} ${
                overflow.y ? 'overflow-y' : ''
            }`}
            id={scrollableId}
            ref={containerRef}
        >
            <div
                className="scrollable-content"
                onDragOver={autoscroll ? handleDragOver : undefined}
                onDragLeave={autoscroll ? cancelDragOver : undefined}
                onDragEnd={autoscroll ? cancelDragOver : undefined}
                onDrop={autoscroll ? cancelDragOver : undefined}
                style={{
                    right: overflow.y ? `${scrollbarSize}px` : '0',
                    bottom: overflow.x ? `${scrollbarSize}px` : '0',
                    transform: `translateX(-${scrollLeft}px)`,
                }}
                ref={contentRef}
            >
                {head ? (
                    <div className="scrollable-head" ref={headRef}>
                        {head}
                    </div>
                ) : null}
                <div
                    className="scrollable-body"
                    style={{
                        width: scrollWidth ? `${scrollWidth}px` : undefined,
                    }}
                >
                    <div
                        className="scrollable-body-content"
                        style={{
                            transform: `translateY(-${scrollTop}px)`,
                        }}
                        data-scroll-top={scrollTop}
                        ref={bodyContentRef}
                    >
                        {body}
                    </div>
                </div>
            </div>
            <Scrollbar
                scrollableId={scrollableId}
                orientation="horizontal"
                clientSize={clientRect.width}
                scrollSize={scrollRect.width}
                scrollAmount={scrollAmountX}
                onChange={setScrollLeft}
                ref={hScrollbarRef}
            />
            <Scrollbar
                scrollableId={scrollableId}
                orientation="vertical"
                clientSize={clientRect.height}
                scrollSize={scrollRect.height}
                scrollAmount={scrollAmountY}
                onChange={setScrollTop}
                onResize={setScrollbarSize}
                ref={vScrollbarRef}
            />
        </div>
    );
}
