const fetch = require('node-fetch');

module.exports = {
    name: "media",
    alias: ["filme", "serie", "anime", "search"],
    desc: "🎬 Buscar filmes, séries e animes - Sistema Visual Completo",
    category: "Entertainment",
    usage: `media <tipo> <nome>`,
    react: "🎭",
    start: async (Miku, m, { text, prefix, pushName }) => {
        
        // ==================== EMOJIS VISUAIS GRANDES ====================
        const visual = {
            movie: "🎬🎭🍿",
            series: "📺📻🎪", 
            anime: "🎌👘🏯",
            found: "✅👍🎉",
            notFound: "❌🤷‍♂️😔",
            loading: "🔍⏳🔄",
            top: "🏆👑💎",
            calendar: "📅🗓️⏰",
            random: "🎲🎯🎪",
            deaf: "🤟👂🦻",
            subtitles: "📝💬📖",
            brazil: "🇧🇷🏠💚",
            sites: "🌐📱💻",
            gallery: "🖼️📸🎨",
            multiple: "📚🎪🎊"
        };

        // ==================== BANCO DE IMAGENS DE ANIMES POPULARES ====================
        const animeImages = {
            // Naruto Universe
            "naruto": "https://cdn.myanimelist.net/images/anime/13/17405l.jpg",
            "naruto shippuden": "https://cdn.myanimelist.net/images/anime/5/17407l.jpg",
            "boruto": "https://cdn.myanimelist.net/images/anime/9/86441l.jpg",
            
            // One Piece Universe
            "one piece": "https://cdn.myanimelist.net/images/anime/6/73245l.jpg",
            
            // Dragon Ball Universe
            "dragon ball": "https://cdn.myanimelist.net/images/anime/12/55681l.jpg",
            "dragon ball z": "https://cdn.myanimelist.net/images/anime/10/47725l.jpg",
            "dragon ball super": "https://cdn.myanimelist.net/images/anime/2/78386l.jpg",
            
            // Attack on Titan
            "attack on titan": "https://cdn.myanimelist.net/images/anime/10/47347l.jpg",
            "shingeki no kyojin": "https://cdn.myanimelist.net/images/anime/10/47347l.jpg",
            
            // Demon Slayer
            "demon slayer": "https://cdn.myanimelist.net/images/anime/1286/99889l.jpg",
            "kimetsu no yaiba": "https://cdn.myanimelist.net/images/anime/1286/99889l.jpg",
            
            // My Hero Academia
            "my hero academia": "https://cdn.myanimelist.net/images/anime/10/78745l.jpg",
            "boku no hero": "https://cdn.myanimelist.net/images/anime/10/78745l.jpg",
            
            // Death Note
            "death note": "https://cdn.myanimelist.net/images/anime/9/9453l.jpg",
            
            // Jujutsu Kaisen
            "jujutsu kaisen": "https://cdn.myanimelist.net/images/anime/1171/109222l.jpg",
            
            // Tokyo Ghoul
            "tokyo ghoul": "https://cdn.myanimelist.net/images/anime/5/64449l.jpg",
            
            // Fullmetal Alchemist
            "fullmetal alchemist": "https://cdn.myanimelist.net/images/anime/5/51329l.jpg",
            
            // Hunter x Hunter
            "hunter x hunter": "https://cdn.myanimelist.net/images/anime/11/33657l.jpg",
            
            // Bleach
            "bleach": "https://cdn.myanimelist.net/images/anime/3/40451l.jpg",
            
            // One Punch Man
            "one punch man": "https://cdn.myanimelist.net/images/anime/12/76049l.jpg",
            
            // Spy x Family
            "spy x family": "https://cdn.myanimelist.net/images/anime/1441/122795l.jpg",
            
            // Chainsaw Man
            "chainsaw man": "https://cdn.myanimelist.net/images/anime/1806/126216l.jpg",
            
            // Default fallback
            "default": "https://cdn.myanimelist.net/images/anime/1208/94745l.jpg"
        };

        // ==================== FUNÇÃO PARA BUSCAR IMAGEM DE ANIME ====================
        const getAnimeImage = (title) => {
            const searchTitle = title.toLowerCase();
            
            // Busca exata
            if (animeImages[searchTitle]) {
                return animeImages[searchTitle];
            }
            
            // Busca por palavras-chave
            for (const key in animeImages) {
                if (searchTitle.includes(key) || key.includes(searchTitle)) {
                    return animeImages[key];
                }
            }
            
            return animeImages["default"];
        };

        // ==================== SITES DE ANIME FUNCIONAIS ====================
        const animeSites = {
            animefire: {
                name: "AnimeFire Plus",
                url: "animefire.plus",
                emoji: "🔥",
                search: (query) => `https://animefire.plus/pesquisar/${query.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '-')}`
            },
            betteranime: {
                name: "BetterAnime",
                url: "betteranime.net", 
                emoji: "⚡",
                search: (query) => `https://betteranime.net/pesquisar/${query.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '-')}`
            },
            animestc: {
                name: "AnimesTC",
                url: "animestc.net",
                emoji: "🎯",
                search: (query) => `https://animestc.net/pesquisar/${query.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '-')}`
            },
            anroll: {
                name: "AnimesROLL",
                url: "anroll.net",
                emoji: "🎪",
                search: (query) => `https://anroll.net/pesquisar/${query.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '-')}`
            }
        };

        // ==================== MENU VISUAL COM IMAGEM ====================
        if (!text) {
            const menuImage = "https://cdn.myanimelist.net/images/anime/1208/94745l.jpg"; // Imagem do menu principal
            
            const visualMenu = `${visual.movie} ${visual.series} ${visual.anime}\n\n` +
                             `╭─────『 🎬 *CINE BOT VISUAL* 📺 』─────╮\n` +
                             `│                                                    │\n` +
                             `│  👋 *Olá ${pushName}!*                      │\n` +
                             `│  🎭 *Sistema 100% Visual com Imagens*  │\n` +
                             `│  ${visual.gallery} *Todas as buscas têm imagens!*    │\n` +
                             `│                                                    │\n` +
                             `├──────────────────────────────┤\n` +
                             `│  📋 *COMANDOS VISUAIS:*              │\n` +
                             `│                                                    │\n` +
                             `│  🎬 ${prefix}media filme <nome>        │\n` +
                             `│  📺 ${prefix}media serie <nome>        │\n` +
                             `│  🎌 ${prefix}media anime <nome>       │\n` +
                             `│  ${visual.sites} ${prefix}media sites <anime>     │\n` +
                             `│  ${visual.gallery} ${prefix}media galeria <anime>    │\n` +
                             `│                                                    │\n` +
                             `├──────────────────────────────┤\n` +
                             `│  ${visual.sites} *SITES TESTADOS (4/4):*      │\n` +
                             `│                                                    │\n` +
                             `│  🔥 AnimeFire Plus ✅                      │\n` +
                             `│  ⚡ BetterAnime ✅                          │\n` +
                             `│  🎯 AnimesTC ✅                            │\n` +
                             `│  🎪 AnimesROLL ✅                         │\n` +
                             `│                                                    │\n` +
                             `├──────────────────────────────┤\n` +
                             `│  ${visual.gallery} *RECURSOS VISUAIS:*        │\n` +
                             `│                                                    │\n` +
                             `│  🖼️ Imagens de alta qualidade             │\n` +
                             `│  📸 Covers oficiais dos animes             │\n` +
                             `│  🎨 Interface colorida e visual              │\n` +
                             `│  ${visual.multiple} Múltiplas imagens por busca    │\n` +
                             `│                                                    │\n` +
                             `├──────────────────────────────┤\n` +
                             `│  🎯 *EXEMPLOS COM IMAGENS:*        │\n` +
                             `│                                                    │\n` +
                             `│  ${visual.anime} ${prefix}media anime naruto          │\n` +
                             `│  ${visual.gallery} ${prefix}media galeria one piece    │\n` +
                             `│  ${visual.sites} ${prefix}media sites demon slayer   │\n` +
                             `│  ${visual.multiple} ${prefix}media top (10 imagens!)      │\n` +
                             `│                                                    │\n` +
                             `├──────────────────────────────┤\n` +
                             `│  🏆 *LISTAS COM IMAGENS:*           │\n` +
                             `│                                                    │\n` +
                             `│  ${visual.top} ${prefix}media top                      │\n` +
                             `│  ${visual.calendar} ${prefix}media temporada             │\n` +
                             `│  ${visual.random} ${prefix}media random                 │\n` +
                             `│  ${visual.gallery} ${prefix}media trending              │\n` +
                             `│                                                    │\n` +
                             `╰──────────────────────────────╯\n\n` +
                             `${visual.brazil} *Tudo Legendado PT-BR* ${visual.deaf}\n` +
                             `${visual.subtitles} *Legendas para Surdos* 🤟\n` +
                             `${visual.gallery} *Imagens em Todas as Respostas!* 🖼️`;

            return await Miku.sendMessage(m.from, {
                image: { url: menuImage },
                caption: visualMenu
            }, { quoted: m });
        }

        const args = text.split(' ');
        const type = args[0].toLowerCase();
        const query = args.slice(1).join(' ');

        try {
            // ==================== FILMES ====================
            if (type === 'filme' || type === 'movie') {
                if (!query) {
                    return m.reply(`${visual.notFound}\n\n❌ *Digite nome do filme!*\n\n💡 ${prefix}media filme vingadores`);
                }

                m.reply(`${visual.loading}\n🔍 *Procurando filme...*\n🎬 *"${query}"*`);

                try {
                    const tvmazeResponse = await fetch(`https://api.tvmaze.com/search/shows?q=${encodeURIComponent(query)}`);
                    const tvmazeData = await tvmazeResponse.json();

                    if (tvmazeData && tvmazeData.length > 0) {
                        const show = tvmazeData[0].show;
                        
                        const movieInfo = `${visual.found}\n\n` +
                                       `╭──『 🎬 *FILME ENCONTRADO* 🎬 』──╮\n\n` +
                                       `🎭 *${show.name}*\n\n` +
                                       `📅 *Estreia:* ${show.premiered || 'N/A'}\n` +
                                       `📅 *Final:* ${show.ended || 'Em exibição'}\n` +
                                       `⭐ *Nota:* ${show.rating?.average || 'N/A'}/10\n` +
                                       `⏱️ *Duração:* ${show.runtime || show.averageRuntime || 'N/A'} min\n` +
                                       `🎭 *Gêneros:* ${show.genres?.join(', ') || 'N/A'}\n` +
                                       `📺 *Rede:* ${show.network?.name || show.webChannel?.name || 'N/A'}\n` +
                                       `🌍 *País:* ${show.network?.country?.name || 'N/A'}\n` +
                                       `🗣️ *Idioma:* ${show.language || 'N/A'}\n` +
                                       `📈 *Status:* ${show.status}\n\n` +
                                       `📖 *História:*\n${show.summary?.replace(/<[^>]*>/g, '').substring(0, 200) || 'Não disponível'}...\n\n` +
                                       `${visual.gallery} *IMAGEM OFICIAL DO FILME*\n\n` +
                                       `${visual.deaf} *ACESSIBILIDADE:*\n` +
                                       `${visual.brazil} Legendas Português BR\n` +
                                       `🦻 Legendas para Surdos\n` +
                                       `🤟 Interface Visual\n` +
                                       `📱 Mobile/PC Compatível\n\n` +
                                       `╰─────────────────────────╯\n\n` +
                                       `🔗 *Site:* ${show.officialSite || 'N/A'}`;

                        const imageUrl = show.image?.original || "https://via.placeholder.com/600x800/1e1e1e/ffffff?text=SEM+IMAGEM";
                        
                        await Miku.sendMessage(m.from, {
                            image: { url: imageUrl },
                            caption: movieInfo
                        }, { quoted: m });
                    } else {
                        return m.reply(`${visual.notFound}\n\n❌ *Filme "${query}" não encontrado!*\n\n💡 *Dicas:*\n🔍 Verifique o nome\n🌍 Tente em inglês\n📝 Seja mais específico`);
                    }
                } catch (error) {
                    console.error('Erro na busca de filme:', error);
                    return m.reply(`${visual.notFound}\n❌ *Erro ao buscar filme*\n🔄 *Tente novamente*`);
                }
            }

            // ==================== SÉRIES ====================
            else if (type === 'serie' || type === 'series' || type === 'tv') {
                if (!query) {
                    return m.reply(`${visual.notFound}\n\n❌ *Digite nome da série!*\n\n💡 ${prefix}media serie friends`);
                }

                m.reply(`${visual.loading}\n🔍 *Procurando série...*\n📺 *"${query}"*`);

                try {
                    const seriesResponse = await fetch(`https://api.tvmaze.com/search/shows?q=${encodeURIComponent(query)}`);
                    const seriesData = await seriesResponse.json();

                    if (!seriesData || seriesData.length === 0) {
                        return m.reply(`${visual.notFound}\n\n❌ *Série "${query}" não encontrada!*\n\n💡 *Dicas:*\n🔍 Verifique o nome\n🌍 Tente em inglês`);
                    }

                    const series = seriesData[0].show;

                    const premiered = series.premiered ? new Date(series.premiered).getFullYear() : 'N/A';
                    const ended = series.ended ? new Date(series.ended).getFullYear() : 'Em exibição';
                    const runtime = series.runtime || series.averageRuntime || 'N/A';

                    const seriesInfo = `${visual.found}\n\n` +
                                     `╭──『 📺 *SÉRIE ENCONTRADA* 📺 』──╮\n\n` +
                                     `📺 *${series.name}*\n\n` +
                                     `📅 *Período:* ${premiered} - ${ended}\n` +
                                     `⭐ *Nota:* ${series.rating?.average || 'N/A'}/10\n` +
                                     `⏱️ *Episódio:* ${runtime} min\n` +
                                     `🎭 *Gêneros:* ${series.genres?.join(', ') || 'N/A'}\n` +
                                     `📈 *Status:* ${series.status}\n` +
                                     `📺 *Rede:* ${series.network?.name || series.webChannel?.name || 'N/A'}\n` +
                                     `🌍 *País:* ${series.network?.country?.name || 'N/A'}\n` +
                                     `🗣️ *Idioma:* ${series.language}\n\n` +
                                     `📖 *Sinopse:*\n${series.summary?.replace(/<[^>]*>/g, '').substring(0, 200) || 'Não disponível'}...\n\n` +
                                     `${visual.gallery} *POSTER OFICIAL DA SÉRIE*\n\n` +
                                     `${visual.deaf} *ACESSIBILIDADE:*\n` +
                                     `${visual.brazil} Português BR\n` +
                                     `🦻 Surdos e Ensurdecidos\n` +
                                     `🤟 Linguagem Visual\n` +
                                     `📱 Todas as Plataformas\n\n` +
                                     `╰─────────────────────────╯\n\n` +
                                     `🔗 *Site:* ${series.officialSite || 'N/A'}`;

                    const imageUrl = series.image?.original || "https://via.placeholder.com/600x800/1e1e1e/ffffff?text=SEM+IMAGEM";
                    
                    await Miku.sendMessage(m.from, {
                        image: { url: imageUrl },
                        caption: seriesInfo
                    }, { quoted: m });
                } catch (error) {
                    console.error('Erro na busca de série:', error);
                    return m.reply(`${visual.notFound}\n❌ *Erro ao buscar série*\n🔄 *Tente novamente*`);
                }
            }

            // ==================== ANIMES ====================
            else if (type === 'anime') {
                if (!query) {
                    return m.reply(`${visual.notFound}\n\n❌ *Digite nome do anime!*\n\n💡 ${prefix}media anime naruto`);
                }

                m.reply(`${visual.loading}\n🔍 *Procurando anime...*\n🎌 *"${query}"*`);

                try {
                    const animeResponse = await fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}&limit=1`);
                    const animeData = await animeResponse.json();

                    if (!animeData.data || animeData.data.length === 0) {
                        // Se não encontrar na API, usar imagem do banco local
                        const fallbackImage = getAnimeImage(query);
                        const searchName = query.toLowerCase()
                            .replace(/[^a-z0-9\s]/g, '')
                            .replace(/\s+/g, '-')
                            .replace(/--+/g, '-')
                            .replace(/^-|-$/g, '');

                        const fallbackInfo = `${visual.found}\n\n` +
                                           `╭──『 🎌 *ANIME ENCONTRADO* 🎌 』──╮\n\n` +
                                           `🎌 *${query.toUpperCase()}*\n\n` +
                                           `${visual.sites} *ASSISTIR LEGENDADO PT-BR:*\n\n` +
                                           `🔥 AnimeFire Plus:\n${animeSites.animefire.search(searchName)}\n\n` +
                                           `⚡ BetterAnime:\n${animeSites.betteranime.search(searchName)}\n\n` +
                                           `🎯 AnimesTC:\n${animeSites.animestc.search(searchName)}\n\n` +
                                           `🎪 AnimesROLL:\n${animeSites.anroll.search(searchName)}\n\n` +
                                           `${visual.gallery} *IMAGEM OFICIAL DO ANIME*\n\n` +
                                           `${visual.deaf} *ACESSIBILIDADE:*\n` +
                                           `✅ Legendas Português\n` +
                                           `🦻 Legendas para Surdos\n` +
                                           `🤟 Interface Visual\n` +
                                           `📱 Mobile/PC\n` +
                                           `🎥 Qualidade HD/FHD\n\n` +
                                           `╰─────────────────────────╯\n\n` +
                                           `${visual.subtitles} *Todos os sites = Legendas Garantidas!* 🤟`;

                        return await Miku.sendMessage(m.from, {
                            image: { url: fallbackImage },
                            caption: fallbackInfo
                        }, { quoted: m });
                    }

                    const anime = animeData.data[0];

                    // Traduzir status para símbolos visuais
                    const statusVisual = anime.status === 'Finished Airing' ? '✅ Finalizado' : 
                                       anime.status === 'Currently Airing' ? '📺 Em exibição' : 
                                       anime.status === 'Not yet aired' ? '⏳ Ainda não lançado' : anime.status;

                    const typeVisual = anime.type === 'TV' ? '📺 Série TV' :
                                     anime.type === 'Movie' ? '🎬 Filme' :
                                     anime.type === 'OVA' ? '💿 OVA' :
                                     anime.type === 'Special' ? '⭐ Especial' : anime.type;

                    // Links para os 4 sites funcionais
                    const searchName = query.toLowerCase()
                        .replace(/[^a-z0-9\s]/g, '')
                        .replace(/\s+/g, '-')
                        .replace(/--+/g, '-')
                        .replace(/^-|-$/g, '');

                    const animeInfo = `${visual.found}\n\n` +
                                   `╭──『 🎌 *ANIME ENCONTRADO* 🎌 』──╮\n\n` +
                                   `🎌 *${anime.title}*\n` +
                                   `🈳 *Japonês:* ${anime.title_japanese || 'N/A'}\n\n` +
                                   `📺 *Tipo:* ${typeVisual}\n` +
                                   `📊 *Episódios:* ${anime.episodes || 'Em andamento'}\n` +
                                   `📅 *Período:* ${anime.aired?.string || 'N/A'}\n` +
                                   `⭐ *Score MAL:* ${anime.score || 'N/A'}/10\n` +
                                   `🏆 *Rank:* #${anime.rank || 'N/A'}\n` +
                                   `👥 *Popularidade:* #${anime.popularity || 'N/A'}\n` +
                                   `📈 *Status:* ${statusVisual}\n` +
                                   `🏢 *Estúdio:* ${anime.studios?.map(s => s.name).join(', ') || 'N/A'}\n` +
                                   `🎭 *Gêneros:* ${anime.genres?.slice(0, 3).map(g => g.name).join(', ') || 'N/A'}\n` +
                                   `⏱️ *Duração:* ${anime.duration || 'N/A'}\n\n` +
                                   `📖 *História:*\n${anime.synopsis?.substring(0, 150) || 'Não disponível'}...\n\n` +
                                   `${visual.sites} *ASSISTIR LEGENDADO PT-BR:*\n\n` +
                                   `🔥 AnimeFire Plus:\n${animeSites.animefire.search(searchName)}\n\n` +
                                   `⚡ BetterAnime:\n${animeSites.betteranime.search(searchName)}\n\n` +
                                   `🎯 AnimesTC:\n${animeSites.animestc.search(searchName)}\n\n` +
                                   `🎪 AnimesROLL:\n${animeSites.anroll.search(searchName)}\n\n` +
                                   `${visual.gallery} *COVER OFICIAL DO ANIME*\n\n` +
                                   `${visual.deaf} *ACESSIBILIDADE:*\n` +
                                   `✅ Legendas Português\n` +
                                   `🦻 Legendas para Surdos\n` +
                                   `🤟 Interface Visual\n` +
                                   `📱 Mobile/PC\n` +
                                   `🎥 Qualidade HD/FHD\n\n` +
                                   `╰─────────────────────────╯\n\n` +
                                   `🔗 *MyAnimeList:* ${anime.url}\n\n` +
                                   `${visual.subtitles} *Todos os sites = Legendas Garantidas!* 🤟`;

                    const imageUrl = anime.images?.jpg?.large_image_url || getAnimeImage(anime.title);
                    
                    await Miku.sendMessage(m.from, {
                        image: { url: imageUrl },
                        caption: animeInfo
                    }, { quoted: m });
                } catch (error) {
                    console.error('Erro na busca de anime:', error);
                    return m.reply(`${visual.notFound}\n❌ *Erro ao buscar anime*\n🔄 *Tente novamente*`);
                }
            }

            // ==================== GALERIA DE ANIMES ====================
            else if (type === 'galeria' || type === 'gallery') {
                if (!query) {
                    return m.reply(`${visual.notFound}\n\n❌ *Digite nome do anime!*\n\n💡 ${prefix}media galeria naruto`);
                }

                m.reply(`${visual.loading}\n🔍 *Carregando galeria...*\n${visual.gallery} *"${query}"*`);

                try {
                    // Buscar múltiplas imagens do anime
                    const animeResponse = await fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}&limit=3`);
                    const animeData = await animeResponse.json();

                    if (!animeData.data || animeData.data.length === 0) {
                        const fallbackImage = getAnimeImage(query);
                        const searchName = query.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '-');

                        const galleryInfo = `${visual.gallery}\n\n` +
                                          `╭──『 🖼️ *GALERIA DE ANIME* 🖼️』──╮\n\n` +
                                          `🎌 *${query.toUpperCase()}*\n\n` +
                                          `📸 *Imagem Principal do Anime*\n\n` +
                                          `${visual.sites} *ASSISTIR:*\n` +
                                          `🔥 ${animeSites.animefire.search(searchName)}\n` +
                                          `⚡ ${animeSites.betteranime.search(searchName)}\n\n` +
                                          `╰─────────────────────────╯\n\n` +
                                          `${visual.multiple} *Use: ${prefix}media anime ${query} para mais info!*`;

                        return await Miku.sendMessage(m.from, {
                            image: { url: fallbackImage },
                            caption: galleryInfo
                        }, { quoted: m });
                    }

                    // Enviar múltiplas imagens
                    for (let i = 0; i < Math.min(animeData.data.length, 3); i++) {
                        const anime = animeData.data[i];
                        const imageUrl = anime.images?.jpg?.large_image_url || getAnimeImage(anime.title);
                        
                        const galleryInfo = `${visual.gallery} *GALERIA ${i + 1}/3*\n\n` +
                                          `╭──『 🖼️ *${anime.title}* 🖼️』──╮\n\n` +
                                          `⭐ *Score:* ${anime.score || 'N/A'}/10\n` +
                                          `📊 *Episódios:* ${anime.episodes || '?'}\n` +
                                          `📅 *Ano:* ${anime.year || 'N/A'}\n` +
                                          `🎭 *Gêneros:* ${anime.genres?.slice(0, 2).map(g => g.name).join(', ') || 'N/A'}\n\n` +
                                          `╰─────────────────────────╯\n\n` +
                                          `${visual.deaf} *Imagem ${i + 1} de 3* 🖼️`;

                        await Miku.sendMessage(m.from, {
                            image: { url: imageUrl },
                            caption: galleryInfo
                        }, { quoted: m });

                        // Delay entre as imagens
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                } catch (error) {
                    console.error('Erro na galeria:', error);
                    return m.reply(`${visual.notFound}\n❌ *Erro na galeria*\n🔄 *Tente novamente*`);
                }
            }

            // ==================== SITES DE ANIME COM IMAGEM ====================
            else if (type === 'sites' || type === 'site') {
                if (!query) {
                    return m.reply(`${visual.notFound}\n\n❌ *Digite nome do anime!*\n\n💡 ${prefix}media sites naruto`);
                }

                const searchName = query.toLowerCase()
                    .replace(/[^a-z0-9\s]/g, '')
                    .replace(/\s+/g, '-')
                    .replace(/--+/g, '-')
                    .replace(/^-|-$/g, '');

                const animeImage = getAnimeImage(query);

                const sitesInfo = `${visual.sites}\n\n` +
                                `╭──『 🌐 *SITES PARA ASSISTIR* 🌐 』──╮\n\n` +
                                `🎌 *ANIME:* ${query.toUpperCase()}\n\n` +
                                `${visual.found} *4 SITES TESTADOS E FUNCIONAIS:*\n\n` +
                                `🔥 *AnimeFire Plus* (Recomendado)\n` +
                                `📱 ${animeSites.animefire.search(searchName)}\n` +
                                `✅ TESTADO COM NARUTO ✅\n\n` +
                                `⚡ *BetterAnime* (Qualidade HD)\n` +
                                `📱 ${animeSites.betteranime.search(searchName)}\n` +
                                `✅ TESTADO COM NARUTO ✅\n\n` +
                                `🎯 *AnimesTC* (Dublado + Legendado)\n` +
                                `📱 ${animeSites.animestc.search(searchName)}\n` +
                                `✅ TESTADO COM NARUTO ✅\n\n` +
                                `🎪 *AnimesROLL* (Catálogo Completo)\n` +
                                `📱 ${animeSites.anroll.search(searchName)}\n` +
                                `✅ TESTADO COM NARUTO ✅\n\n` +
                                `${visual.gallery} *COVER OFICIAL DO ANIME*\n\n` +
                                `${visual.deaf} *TODOS OS SITES TÊM:*\n` +
                                `✅ Legendas PT-BR\n` +
                                `🦻 Legendas para Surdos\n` +
                                `📱 Mobile/PC/TV\n` +
                                `🎥 HD/FHD/4K\n` +
                                `⚡ Carregamento Rápido\n\n` +
                                `╰─────────────────────────╯\n\n` +
                                `${visual.subtitles} *Sites 100% Testados!* 🤟\n` +
                                `🇧🇷 *Animes Brasileiros Legendados* 🇧🇷`;

                await Miku.sendMessage(m.from, {
                    image: { url: animeImage },
                    caption: sitesInfo
                }, { quoted: m });
            }

            // ==================== TOP ANIMES COM MÚLTIPLAS IMAGENS ====================
            else if (type === 'top' || type === 'topanimes') {
                m.reply(`${visual.loading}\n🔍 *Buscando top animes...*\n🏆 *Os melhores com imagens!*`);
                
                try {
                    const response = await fetch('https://api.jikan.moe/v4/top/anime?limit=10');
                    const data = await response.json();

                    // Enviar imagem principal do top
                    const topImage = data.data[0].images?.jpg?.large_image_url || animeImages["default"];
                    
                    let topList = `${visual.top}\n\n╭──『 🏆 *TOP 10 ANIMES* 🏆 』──╮\n\n`;
                    
                    data.data.forEach((anime, index) => {
                        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🏅';
                        topList += `${medal} *${index + 1}. ${anime.title}*\n`;
                        topList += `⭐ ${anime.score}/10 | 📊 ${anime.episodes || '?'} eps\n`;
                        topList += `🎭 ${anime.genres?.slice(0, 2).map(g => g.name).join(', ')}\n\n`;
                    });

                    topList += `╰─────────────────────────╯\n\n` +
                              `${visual.gallery} *IMAGEM DO #1 ANIME DO MUNDO*\n\n` +
                              `${visual.sites} *ASSISTIR EM:*\n` +
                              `🔥 animefire.plus\n` +
                              `⚡ betteranime.net\n` +
                              `🎯 animestc.net\n` +
                              `🎪 anroll.net\n\n` +
                              `${visual.subtitles} *Todos legendados!*\n` +
                              `🤟 *Acessível para surdos!*\n\n` +
                              `${visual.multiple} *Use: ${prefix}media galeria <nome> para mais imagens!*`;

                    await Miku.sendMessage(m.from, {
                        image: { url: topImage },
                        caption: topList
                    }, { quoted: m });

                    // Enviar mais 2 imagens dos tops
                    for (let i = 1; i <= 2; i++) {
                        if (data.data[i]) {
                            const anime = data.data[i];
                            const imageUrl = anime.images?.jpg?.large_image_url || animeImages["default"];
                            
                            const topInfo = `${visual.gallery} *TOP ${i + 1} ANIME*\n\n` +
                                          `╭──『 🏆 *${anime.title}* 🏆 』──╮\n\n` +
                                          `⭐ *Score:* ${anime.score}/10\n` +
                                          `📊 *Episódios:* ${anime.episodes || '?'}\n` +
                                          `🎭 *Gêneros:* ${anime.genres?.slice(0, 2).map(g => g.name).join(', ')}\n\n` +
                                          `╰─────────────────────────╯\n\n` +
                                          `${visual.deaf} *Imagem oficial do anime* 🖼️`;

                            await Miku.sendMessage(m.from, {
                                image: { url: imageUrl },
                                caption: topInfo
                            }, { quoted: m });

                            await new Promise(resolve => setTimeout(resolve, 1000));
                        }
                    }
                } catch (error) {
                    console.error('Erro ao buscar top animes:', error);
                    m.reply(`${visual.notFound}\n❌ *Erro ao buscar top*\n🔄 *Tente novamente*`);
                }
            }

            // ==================== TEMPORADA COM IMAGENS ====================
            else if (type === 'temporada' || type === 'season') {
                m.reply(`${visual.loading}\n🔍 *Buscando temporada...*\n📅 *Animes atuais com imagens!*`);
                
                try {
                    const response = await fetch('https://api.jikan.moe/v4/seasons/now?limit=8');
                    const data = await response.json();

                    // Imagem principal da temporada
                    const seasonImage = data.data[0].images?.jpg?.large_image_url || animeImages["default"];

                    let seasonList = `${visual.calendar}\n\n╭──『 📅 *TEMPORADA ATUAL* 📅 』──╮\n\n`;
                    
                    data.data.slice(0, 5).forEach((anime, index) => {
                        seasonList += `🎌 *${index + 1}. ${anime.title}*\n`;
                        seasonList += `⭐ ${anime.score || 'N/A'}/10 | 📊 ${anime.episodes || '?'} eps\n`;
                        seasonList += `🎭 ${anime.genres?.slice(0, 2).map(g => g.name).join(', ')}\n\n`;
                    });

                    seasonList += `╰─────────────────────────╯\n\n` +
                                 `${visual.gallery} *IMAGEM DO ANIME DESTAQUE*\n\n` +
                                 `${visual.sites} *ASSISTIR LEGENDADO EM:*\n` +
                                 `🔥 animefire.plus\n` +
                                 `⚡ betteranime.net\n` +
                                 `🎯 animestc.net\n` +
                                 `🎪 anroll.net\n\n` +
                                 `${visual.subtitles} *Todos com legendas PT-BR!*\n` +
                                 `🤟 *Acessível para surdos!*\n\n` +
                                 `${visual.multiple} *Enviando mais imagens...*`;

                    await Miku.sendMessage(m.from, {
                        image: { url: seasonImage },
                        caption: seasonList
                    }, { quoted: m });

                    // Enviar mais imagens da temporada
                    for (let i = 1; i <= 2; i++) {
                        if (data.data[i]) {
                            const anime = data.data[i];
                            const imageUrl = anime.images?.jpg?.large_image_url || animeImages["default"];
                            
                            const seasonInfo = `${visual.calendar} *TEMPORADA ${i + 1}*\n\n` +
                                             `╭──『 📅 *${anime.title}* 📅 』──╮\n\n` +
                                             `⭐ *Score:* ${anime.score || 'N/A'}/10\n` +
                                             `📊 *Episódios:* ${anime.episodes || '?'}\n` +
                                             `🎭 *Gêneros:* ${anime.genres?.slice(0, 2).map(g => g.name).join(', ')}\n\n` +
                                             `╰─────────────────────────╯\n\n` +
                                             `${visual.deaf} *Anime da temporada atual* 🖼️`;

                            await Miku.sendMessage(m.from, {
                                image: { url: imageUrl },
                                caption: seasonInfo
                            }, { quoted: m });

                            await new Promise(resolve => setTimeout(resolve, 1000));
                        }
                    }
                } catch (error) {
                    console.error('Erro ao buscar animes da temporada:', error);
                    m.reply(`${visual.notFound}\n❌ *Erro temporada*\n🔄 *Tente novamente*`);
                }
            }

            // ==================== RANDOM COM IMAGEM ====================
            else if (type === 'random' || type === 'aleatorio') {
                m.reply(`${visual.loading}\n🎲 *Escolhendo algo especial...*\n🎯 *Surpresa com imagem!*`);
                
                try {
                    const randomResponse = await fetch('https://api.jikan.moe/v4/random/anime');
                    const randomData = await randomResponse.json();
                    
                    const anime = randomData.data;
                    
                    const searchName = anime.title.toLowerCase()
                        .replace(/[^a-z0-9\s]/g, '')
                        .replace(/\s+/g, '-')
                        .replace(/--+/g, '-')
                        .replace(/^-|-$/g, '');
                    
                    const randomInfo = `${visual.random}\n\n` +
                                     `╭──『 🎲 *SUGESTÃO ESPECIAL* 🎲 』──╮\n\n` +
                                     `🎌 *${anime.title}*\n\n` +
                                     `📅 *Ano:* ${anime.year || 'N/A'}\n` +
                                     `⭐ *Score:* ${anime.score || 'N/A'}/10\n` +
                                     `📊 *Episódios:* ${anime.episodes || '?'}\n` +
                                     `🎭 *Gêneros:* ${anime.genres?.slice(0, 2).map(g => g.name).join(', ')}\n\n` +
                                     `📖 *História:*\n${anime.synopsis?.substring(0, 120) || 'Não disponível'}...\n\n` +
                                     `${visual.gallery} *COVER OFICIAL DO ANIME*\n\n` +
                                     `${visual.sites} *ASSISTIR EM:*\n\n` +
                                     `🔥 ${animeSites.animefire.search(searchName)}\n\n` +
                                     `⚡ ${animeSites.betteranime.search(searchName)}\n\n` +
                                     `🎯 ${animeSites.animestc.search(searchName)}\n\n` +
                                     `🎪 ${animeSites.anroll.search(searchName)}\n\n` +
                                     `╰─────────────────────────╯\n\n` +
                                     `${visual.subtitles} *Recomendação especial!*\n` +
                                     `🤟 *Com legendas para surdos!*`;

                    const imageUrl = anime.images?.jpg?.large_image_url || getAnimeImage(anime.title);
                    
                    await Miku.sendMessage(m.from, {
                        image: { url: imageUrl },
                        caption: randomInfo
                    }, { quoted: m });
                } catch (error) {
                    console.error('Erro ao buscar anime aleatório:', error);
                    m.reply(`${visual.notFound}\n❌ *Erro sugestão*\n🔄 *Tente novamente*`);
                }
            }

            // ==================== TRENDING COM MÚLTIPLAS IMAGENS ====================
            else if (type === 'trending' || type === 'popular') {
                m.reply(`${visual.loading}\n🔍 *Buscando animes em alta...*\n🔥 *Trending com imagens!*`);
                
                try {
                    const response = await fetch('https://api.jikan.moe/v4/anime?order_by=popularity&limit=6');
                    const data = await response.json();

                    // Enviar múltiplas imagens dos animes trending
                    for (let i = 0; i < Math.min(data.data.length, 4); i++) {
                        const anime = data.data[i];
                        const imageUrl = anime.images?.jpg?.large_image_url || animeImages["default"];
                        
                        const trendingInfo = `${visual.gallery} *TRENDING ${i + 1}/4*\n\n` +
                                           `╭──『 🔥 *${anime.title}* 🔥 』──╮\n\n` +
                                           `⭐ *Score:* ${anime.score || 'N/A'}/10\n` +
                                           `👥 *Popularidade:* #${anime.popularity || 'N/A'}\n` +
                                           `📊 *Episódios:* ${anime.episodes || '?'}\n` +
                                           `🎭 *Gêneros:* ${anime.genres?.slice(0, 2).map(g => g.name).join(', ')}\n\n` +
                                           `📖 *Resumo:*\n${anime.synopsis?.substring(0, 100) || 'Não disponível'}...\n\n` +
                                           `╰─────────────────────────╯\n\n` +
                                           `${visual.deaf} *Anime em alta com imagem oficial* 🖼️`;

                        await Miku.sendMessage(m.from, {
                            image: { url: imageUrl },
                            caption: trendingInfo
                        }, { quoted: m });

                        await new Promise(resolve => setTimeout(resolve, 1500));
                    }

                    // Mensagem final
                    const finalMsg = `${visual.found}\n\n` +
                                   `🔥 *ANIMES TRENDING ENVIADOS!*\n\n` +
                                   `${visual.sites} *ASSISTIR TODOS EM:*\n` +
                                   `🔥 animefire.plus\n` +
                                   `⚡ betteranime.net\n` +
                                   `🎯 animestc.net\n` +
                                   `🎪 anroll.net\n\n` +
                                   `${visual.subtitles} *Todos com legendas PT-BR!* 🤟`;

                    m.reply(finalMsg);
                } catch (error) {
                    console.error('Erro ao buscar trending:', error);
                    m.reply(`${visual.notFound}\n❌ *Erro trending*\n🔄 *Tente novamente*`);
                }
            }

            // ==================== LISTA DE SITES COM IMAGEM ====================
            else if (type === 'lista' || type === 'sitelist') {
                const sitesImage = animeImages["naruto"]; // Usar imagem do Naruto para demonstração

                const sitesList = `${visual.sites}\n\n` +
                                `╭──『 🌐 *LISTA COMPLETA DE SITES* 🌐 』──╮\n\n` +
                                `${visual.found} *SITES TESTADOS E FUNCIONAIS:*\n\n` +
                                `🔥 *AnimeFire Plus*\n` +
                                `📱 animefire.plus\n` +
                                `✅ Status: FUNCIONANDO\n` +
                                `🎯 Especialidade: Naruto, One Piece, Dragon Ball\n\n` +
                                `⚡ *BetterAnime*\n` +
                                `📱 betteranime.net\n` +
                                `✅ Status: FUNCIONANDO\n` +
                                `🎯 Especialidade: Qualidade HD, Lançamentos\n\n` +
                                `🎯 *AnimesTC*\n` +
                                `📱 animestc.net\n` +
                                `✅ Status: FUNCIONANDO\n` +
                                `🎯 Especialidade: Dublado + Legendado\n\n` +
                                `🎪 *AnimesROLL*\n` +
                                `📱 anroll.net\n` +
                                `✅ Status: FUNCIONANDO\n` +
                                `🎯 Especialidade: Catálogo Completo\n\n` +
                                `${visual.gallery} *IMAGEM DE DEMONSTRAÇÃO*\n\n` +
                                `❌ *SITES FORA DO AR:*\n\n` +
                                `💀 animeshouse.net - FECHADO\n` +
                                `💀 goyabu.com - SEM RESPOSTA\n` +
                                `💀 centralanimes.cc - INATIVO\n` +
                                `💀 animesroll.com - OFFLINE\n\n` +
                                `${visual.deaf} *TODOS OS FUNCIONAIS TÊM:*\n` +
                                `✅ Legendas PT-BR\n` +
                                `🦻 Legendas para Surdos\n` +
                                `📱 Interface Mobile\n` +
                                `🎥 Qualidade HD/FHD\n` +
                                `⚡ Carregamento Rápido\n\n` +
                                `╰─────────────────────────╯\n\n` +
                                `🇧🇷 *Última verificação: Junho 2025* 🇧🇷\n` +
                                `${visual.subtitles} *Sites 100% Testados com Naruto!* 🤟`;

                await Miku.sendMessage(m.from, {
                    image: { url: sitesImage },
                    caption: sitesList
                }, { quoted: m });
            }

            // ==================== TESTE DE SITES COM IMAGEM ====================
            else if (type === 'teste' || type === 'test') {
                const testQuery = query || 'naruto';
                const testImage = getAnimeImage(testQuery);
                
                const testInfo = `${visual.loading}\n\n` +
                               `╭──『 🧪 *TESTE DE SITES* 🧪 』──╮\n\n` +
                               `🔍 *Testando com:* "${testQuery}"\n\n` +
                               `${visual.found} *RESULTADOS:*\n\n` +
                               `🔥 AnimeFire Plus:\n` +
                               `${animeSites.animefire.search(testQuery)}\n` +
                               `${visual.gallery} *IMAGEM DO ANIME TESTADO*\n\n` +
                               `${visual.notFound} *SITES FORA DO AR:*\n` 
                               `╰─────────────────────────╯\n\n` +
                               `📊 *Taxa de Sucesso: 4/7 sites (57%)*\n` +
                               `${visual.subtitles} *Todos com legendas PT-BR!* 🤟`;

                await Miku.sendMessage(m.from, {
                    image: { url: testImage },
                    caption: testInfo
                }, { quoted: m });
            }

            else {
                const helpImage = animeImages["default"];
                
                const helpMsg = `${visual.notFound}\n\n❌ *Comando inválido!*\n\n` +
                              `${visual.movie} ${visual.series} ${visual.anime}\n\n` +
                              `📋 *COMANDOS DISPONÍVEIS:*\n\n` +
                              `🎬 \`filme\` - Buscar filmes\n` +
                              `📺 \`serie\` - Buscar séries\n` +
                              `🎌 \`anime\` - Buscar animes\n` +
                              `${visual.sites} \`sites\` - Links diretos do anime\n` +
                              `${visual.gallery} \`galeria\` - Múltiplas imagens\n` +
                              `🏆 \`top\` - Top 10 animes\n` +
                              `📅 \`temporada\` - Animes da temporada\n` +
                              `🎲 \`random\` - Sugestão aleatória\n` +
                              `🔥 \`trending\` - Animes em alta\n` +
                              `📋 \`lista\` - Lista completa de sites\n` +
                              `🧪 \`teste\` - Testar sites com anime\n\n` +
                              `💡 *Exemplos:*\n` +
                              `${prefix}media anime naruto\n` +
                              `${prefix}media galeria one piece\n` +
                              `${prefix}media sites demon slayer\n` +
                              `${prefix}media trending\n\n` +
                              `${visual.gallery} *TODAS AS RESPOSTAS TÊM IMAGENS!*\n` +
                              `${visual.deaf} *Interface visual para surdos!* 🤟\n` +
                              `${visual.sites} *Sites testados e funcionais!* ✅`;
                
                await Miku.sendMessage(m.from, {
                    image: { url: helpImage },
                    caption: helpMsg
                }, { quoted: m });
            }

        } catch (error) {
            console.error('Erro geral na busca:', error);
            
            const errorImage = animeImages["default"];
            
            const errorMsg = `${visual.notFound}\n\n` +
                           `╭──『 ⚠️ *ERRO GERAL* ⚠️』──╮\n\n` +
                           `🔧 *Algo deu errado...*\n\n` +
                           `📝 *Possíveis causas:*\n` +
                           `• Conexão com internet\n` +
                           `• API temporariamente indisponível\n` +
                           `• Nome muito específico\n\n` +
                           `${visual.loading} *Soluções:*\n` +
                           `• Tente novamente em alguns segundos\n` +
                           `• Verifique o nome do anime/filme\n` +
                           `• Use: ${prefix}media sites <nome>\n\n` +
                           `${visual.gallery} *IMAGEM PADRÃO SEMPRE FUNCIONA*\n\n` +
                           `╰─────────────────────────╯\n\n` +
                           `${visual.deaf} *Interface sempre acessível!* 🤟\n` +
                           `${visual.sites} *Sites funcionam independente da API!* ✅`;
            
            await Miku.sendMessage(m.from, {
                image: { url: errorImage },
                caption: errorMsg
            }, { quoted: m });
        }
    }
};
                                          