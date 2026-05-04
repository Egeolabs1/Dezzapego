import { renderToPipeableStream } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { PassThrough } from 'node:stream';
import { AppProviders, AppRoutes } from './app/App';

type HelmetData = {
    title?: { toString(): string };
    priority?: { toString(): string };
    meta?: { toString(): string };
    link?: { toString(): string };
    script?: { toString(): string };
};

function streamToString(stream: PassThrough): Promise<string> {
    return new Promise((resolve, reject) => {
        let html = '';
        stream.setEncoding('utf8');
        stream.on('data', (chunk) => {
            html += chunk;
        });
        stream.on('end', () => resolve(html));
        stream.on('error', reject);
    });
}

export function render(url: string): Promise<{ appHtml: string; headHtml: string }> {
    const helmetContext: { helmet?: HelmetData } = {};

    return new Promise((resolve, reject) => {
        const stream = new PassThrough();
        const { pipe } = renderToPipeableStream(
            <AppProviders helmetContext={helmetContext}>
                <MemoryRouter initialEntries={[url]}>
                    <AppRoutes />
                </MemoryRouter>
            </AppProviders>,
            {
                onAllReady() {
                    pipe(stream);
                    streamToString(stream)
                        .then((appHtml) => {
                            const helmet = helmetContext.helmet;
                            const headHtml = [
                                helmet?.title?.toString(),
                                helmet?.priority?.toString(),
                                helmet?.meta?.toString(),
                                helmet?.link?.toString(),
                                helmet?.script?.toString(),
                            ]
                                .filter(Boolean)
                                .join('\n');
                            resolve({ appHtml, headHtml });
                        })
                        .catch(reject);
                },
                onError(error) {
                    reject(error);
                },
            },
        );
    });
}
