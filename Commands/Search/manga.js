const https = require('https');

module.exports = {
    name: "manga",
    alias: ["mangasearch"],
    desc: "To get a manga search result",
    category: "Search",
    usage: `manga <search term>`,
    react: "👹",
    start: async (Yaka, m, { text, prefix, args }) => {
        try {
            if (!args[0])
                return Yaka.sendMessage(
                    m.from,
                    { text: `Please provide a manga name to search !` },
                    { quoted: m }
                );
            
            var MangasearchTerm = args.join(" ");
            
            // Função para buscar dados
            const searchManga = () => {
                return new Promise((resolve, reject) => {
                    const options = {
                        hostname: 'api.jikan.moe',
                        path: `/v4/manga?q=${encodeURIComponent(MangasearchTerm)}&limit=1`,
                        method: 'GET',
                        headers: {
                            'User-Agent': 'Mozilla/5.0'
                        }
                    };
                    
                    const req = https.request(options, (res) => {
                        let data = '';
                        
                        res.on('data', (chunk) => {
                            data += chunk;
                        });
                        
                        res.on('end', () => {
                            try {
                                const jsonData = JSON.parse(data);
                                resolve(jsonData);
                            } catch (error) {
                                reject(error);
                            }
                        });
                    });
                    
                    req.on('error', (error) => {
                        reject(error);
                    });
                    
                    req.end();
                });
            };
            
            // Tentar múltiplas vezes com delay se necessário
            let result = null;
            let attempts = 0;
            const maxAttempts = 3;
            
            while (!result && attempts < maxAttempts) {
                try {
                    if (attempts > 0) {
                        await new Promise(resolve => setTimeout(resolve, 2000)); // Delay de 2s
                    }
                    
                    const manga = await searchManga();
                    
                    if (manga && manga.data && manga.data.length > 0) {
                        result = manga.data[0];
                    }
                    attempts++;
                } catch (error) {
                    attempts++;
                    if (attempts >= maxAttempts) {
                        throw error;
                    }
                }
            }
            
            if (!result) {
                return Yaka.sendMessage(
                    m.from,
                    { text: `Manga "${MangasearchTerm}" não encontrado. Tente outro nome.` },
                    { quoted: m }
                );
            }
            
            let details = `*『 Manga Search Engine 』*\n\n\n*🍃 Manga Title:* ${result.title}\n`;
            details += `\n*🎋 Type:* ${result.type || 'N/A'}\n`;
            details += `*📈 Status:* ${result.status ? result.status.toUpperCase().replace(/\_/g, " ") : 'N/A'}\n`;
            details += `*🍥 Volumes:* ${result.volumes || 'N/A'}\n`;
            details += `*🍥 Chapters:* ${result.chapters || 'N/A'}\n`;
            details += `*🧧 Genres:*\n`;
            
            if (result.genres && result.genres.length > 0) {
                result.genres.forEach(genre => {
                    details += `\t\t\t${genre.name}\n`;
                });
            } else {
                details += `\t\t\tN/A\n`;
            }
            
            details += `*🧧 Themes:*\n`;
            if (result.themes && result.themes.length > 0) {
                result.themes.forEach(theme => {
                    details += `\t\t\t${theme.name}\n`;
                });
            } else {
                details += `\t\t\tN/A\n`;
            }
            
            details += `*📍 Authors:*\n`;
            if (result.authors && result.authors.length > 0) {
                result.authors.forEach(author => {
                    details += `\t\t\t${author.name}\n`;
                });
            } else {
                details += `\t\t\tN/A\n`;
            }
            
            details += `\n*🎐 Score:* ${result.score || 'N/A'}\n`;
            details += `*🎏 Favorites:* ${result.favorites || 'N/A'}\n`;
            details += `*🎇 Rank:* ${result.rank || 'N/A'}\n`;
            details += `*🏅 Popularity:* ${result.popularity || 'N/A'}\n\n`;
            details += `\n*🌐 URL:* ${result.url || 'N/A'}\n\n`;
            
            // Enviar resposta com imagem se disponível
            if (result.images && result.images.jpg && result.images.jpg.large_image_url) {
                await Yaka.sendMessage(m.from, {
                    image: { url: result.images.jpg.large_image_url },
                    caption: details
                }, { quoted: m });
            } else {
                await Yaka.sendMessage(m.from, {
                    text: details
                }, { quoted: m });
            }
            
        } catch (error) {
            console.error('Erro na busca de manga:', error);
            await Yaka.sendMessage(
                m.from,
                { text: `Erro ao buscar manga. Tente novamente.` },
                { quoted: m }
            );
        }
    },
};