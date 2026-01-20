from typing import Any, Type
import structlog

from .base import ExtractPlugin, TransformPlugin, LoadPlugin, BasePlugin

logger = structlog.get_logger()


class PluginRegistry:
    def __init__(self) -> None:
        self._extract_plugins: dict[str, Type[ExtractPlugin]] = {}
        self._transform_plugins: dict[str, Type[TransformPlugin]] = {}
        self._load_plugins: dict[str, Type[LoadPlugin]] = {}

    def register_extract(self, name: str) -> Any:
        def decorator(cls: Type[ExtractPlugin]) -> Type[ExtractPlugin]:
            cls.name = name
            self._extract_plugins[name] = cls
            logger.info("registered_extract_plugin", name=name)
            return cls

        return decorator

    def register_transform(self, name: str) -> Any:
        def decorator(cls: Type[TransformPlugin]) -> Type[TransformPlugin]:
            cls.name = name
            self._transform_plugins[name] = cls
            logger.info("registered_transform_plugin", name=name)
            return cls

        return decorator

    def register_load(self, name: str) -> Any:
        def decorator(cls: Type[LoadPlugin]) -> Type[LoadPlugin]:
            cls.name = name
            self._load_plugins[name] = cls
            logger.info("registered_load_plugin", name=name)
            return cls

        return decorator

    def get_extract(self, name: str, config: dict[str, Any]) -> ExtractPlugin:
        if name not in self._extract_plugins:
            raise ValueError(f"Unknown extract plugin: {name}")
        return self._extract_plugins[name](config)

    def get_transform(self, name: str, config: dict[str, Any]) -> TransformPlugin:
        if name not in self._transform_plugins:
            raise ValueError(f"Unknown transform plugin: {name}")
        return self._transform_plugins[name](config)

    def get_load(self, name: str, config: dict[str, Any]) -> LoadPlugin:
        if name not in self._load_plugins:
            raise ValueError(f"Unknown load plugin: {name}")
        return self._load_plugins[name](config)

    def get_plugin(self, plugin_type: str, name: str, config: dict[str, Any]) -> BasePlugin:
        if plugin_type == "extract":
            return self.get_extract(name, config)
        elif plugin_type == "transform":
            return self.get_transform(name, config)
        elif plugin_type == "load":
            return self.get_load(name, config)
        else:
            raise ValueError(f"Unknown plugin type: {plugin_type}")

    def list_plugins(self) -> dict[str, list[str]]:
        return {
            "extract": list(self._extract_plugins.keys()),
            "transform": list(self._transform_plugins.keys()),
            "load": list(self._load_plugins.keys()),
        }


registry = PluginRegistry()
