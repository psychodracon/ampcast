import {useEffect, useState} from 'react';

export default function useElementHidden(
    target: React.RefObject<HTMLElement | null> | HTMLElement | null
) {
    const [hidden, setHidden] = useState(true);

    useEffect(() => {
        const element = getElement(target);
        if (element) {
            const observer = new IntersectionObserver(([entry]) =>
                setHidden(!entry.isIntersecting)
            );
            observer.observe(element);
            return () => observer.disconnect();
        }
    }, [target]);

    return hidden;
}

function getElement(
    target: React.RefObject<HTMLElement | null> | HTMLElement | null
): HTMLElement | null {
    return target && 'current' in target ? target.current : target;
}
