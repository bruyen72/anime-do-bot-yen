const fetch = require('node-fetch');

module.exports = {
    name: "anime",
    alias: ["animesearch"],
    desc: "To get an anime search result",
    category: "Search",
    usage: `anime <search term>`,
    react: "👹",
    start: async (Yaka, m, { text, prefix, args }) => {
        try {
            if (!args[0])
                return Yaka.sendMessage(
                    m.from,
                    { text: `Please provide a anime name to search !` },
                    { quoted: m }
                );
            
            var AnimesearchTerm = args.join(" ");
            
            // Função para tentar múltiplas APIs
            const tryMultipleAPIs = async () => {
                // API 1: Jikan v4
                try {
                    const jikanResponse = await fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(AnimesearchTerm)}&limit=1`);
                    const jikanData = await jikanResponse.json();
                    if (jikanData && jikanData.data && jikanData.data.length > 0) {
                        return formatJikanResult(jikanData.data[0]);
                    }
                } catch (error) {
                    console.log('Jikan API failed, trying next...');
                }
                
                // API 2: AniAPI
                try {
                    const aniResponse = await fetch(`https://api.aniapi.com/v1/anime?title=${encodeURIComponent(AnimesearchTerm)}`);
                    const aniData = await aniResponse.json();
                    if (aniData && aniData.data && aniData.data[0]) {
                        return formatAniAPIResult(aniData.data[0]);
                    }
                } catch (error) {
                    console.log('AniAPI failed, trying next...');
                }
                
                // API 3: Kitsu
                try {
                    const kitsuResponse = await fetch(`https://kitsu.io/api/edge/anime?filter[text]=${encodeURIComponent(AnimesearchTerm)}`);
                    const kitsuData = await kitsuResponse.json();
                    if (kitsuData && kitsuData.data && kitsuData.data[0]) {
                        return formatKitsuResult(kitsuData.data[0]);
                    }
                } catch (error) {
                    console.log('Kitsu API failed');
                }
                
                throw new Error('All APIs failed');
            };
            
            // Formatar resultado da Jikan API
            const formatJikanResult = (result) => {
                let details = ` 『 Anime Search Engine 』\n\n\n*🍃 Anime Title:* ${result.title}\n`;
                details += `\n*🎋 Format:* ${result.type || 'N/A'}\n`;
                details += `*📈 Status:* ${result.status ? result.status.toUpperCase().replace(/\_/g, " ") : 'N/A'}\n`;
                details += `*🍥 Total episodes:* ${result.episodes || 'N/A'}\n`;
                details += `*🎈 Duration:* ${result.duration || 'N/A'}\n`;
                details += `*🧧 Genres:*\n`;
                
                if (result.genres && result.genres.length > 0) {
                    result.genres.forEach(genre => {
                        details += `\t\t\t\t\t\t\t\t${genre.name}\n`;
                    });
                } else {
                    details += `\t\t\t\t\t\t\t\tN/A\n`;
                }
                
                details += `\n*✨ Based on:* ${result.source ? result.source.toUpperCase() : 'N/A'}\n`;
                details += `*📍 Studios:*\n`;
                
                if (result.studios && result.studios.length > 0) {
                    result.studios.forEach(studio => {
                        details += `\t\t\t\t\t\t\t\t${studio.name}\n`;
                    });
                } else {
                    details += `\t\t\t\t\t\t\t\tN/A\n`;
                }
                
                details += `*🎴 Producers:*\n`;
                
                if (result.producers && result.producers.length > 0) {
                    result.producers.forEach(producer => {
                        details += `\t\t\t\t\t\t\t\t\t\t${producer.name}\n`;
                    });
                } else {
                    details += `\t\t\t\t\t\t\t\t\t\tN/A\n`;
                }
                
                details += `\n*🎐 Popularity:* ${result.popularity || 'N/A'}\n`;
                details += `*🎏 Favorites:* ${result.favorites || 'N/A'}\n`;
                details += `*🎇 Rating:* ${result.score || 'N/A'}\n`;
                details += `*🏅 Rank:* ${result.rank || 'N/A'}\n\n`;
                details += `\n*🌐 URL:* ${result.url || 'N/A'}\n\n`;
                
                return {
                    image: result.images?.jpg?.large_image_url || result.images?.jpg?.image_url,
                    details: details
                };
            };
            
            // Formatar resultado da AniAPI
            const formatAniAPIResult = (result) => {
                let details = ` 『 Anime Search Engine 』\n\n\n*🍃 Anime Title:* ${result.titles.en || result.titles.jp}\n`;
                details += `\n*🎋 Format:* ${result.format || 'N/A'}\n`;
                details += `*📈 Status:* ${result.status || 'N/A'}\n`;
                details += `*🍥 Total episodes:* ${result.episodes_count || 'N/A'}\n\n`;
                
                return {
                    image: result.cover_image,
                    details: details
                };
            };
            
            // Formatar resultado da Kitsu
            const formatKitsuResult = (result) => {
                let attributes = result.attributes;
                let details = ` 『 Anime Search Engine 』\n\n\n*🍃 Anime Title:* ${attributes.canonicalTitle}\n`;
                details += `\n*🎋 Format:* ${attributes.showType || 'N/A'}\n`;
                details += `*📈 Status:* ${attributes.status || 'N/A'}\n`;
                details += `*🍥 Total episodes:* ${attributes.episodeCount || 'N/A'}\n`;
                details += `*🎇 Rating:* ${attributes.averageRating || 'N/A'}\n\n`;
                
                return {
                    image: attributes.posterImage?.large || attributes.posterImage?.medium,
                    details: details
                };
            };
            
            // Tentar buscar o anime
            const resultData = await tryMultipleAPIs();
            
            if (resultData.image) {
                await Yaka.sendMessage(m.from, { 
                    image: { url: resultData.image },
                    caption: resultData.details 
                }, { quoted: m });
            } else {
                await Yaka.sendMessage(m.from, { 
                    text: resultData.details 
                }, { quoted: m });
            }
            
        } catch (error) {
            console.error('Erro na busca de anime:', error);
            await Yaka.sendMessage(
                m.from,
                { text: `Erro ao buscar anime. Verifique o nome e tente novamente.` },
                { quoted: m }
            );
        }
    },
};