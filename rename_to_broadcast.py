#!/usr/bin/env python
"""
Script to rename all 'Comercial/comercial' references to 'Broadcast/broadcast'
throughout the backend codebase.
"""
import os
import re

# Files to process
FILES_TO_PROCESS = [
    'core/views.py',
    'core/urls.py',
    'core/tasks.py',
]

# Replacement patterns
REPLACEMENTS = [
    # Class names
    (r'\bComercial\b', 'Broadcast'),
    (r'\bComercialViewSet\b', 'BroadcastViewSet'),
    (r'\bComercialSerializer\b', 'BroadcastSerializer'),
    
    # Variable names
    (r'\bcomercial\b', 'broadcast'),
    (r'\bcomerciales\b', 'broadcasts'),
    (r'comercial_id', 'broadcast_id'),
    (r'comercial_data', 'broadcast_data'),
    
    # URLs
    (r"'comercial'", "'broadcast'"),
    (r"'comerciales'", "'broadcasts'"),
    (r'/comerciales/', '/broadcasts/'),
    (r'r\'comerciales\'', 'r\'broadcasts\''),
    
    # Messages and logs
    (r'Comercial no encontrado', 'Broadcast not found'),
    (r'El comercial no tiene', 'The broadcast does not have'),
    (r'comercial {', 'broadcast {'),
    (r'Eliminando comercial', 'Deleting broadcast'),
    (r'Codificación personalizada iniciada para comercial', 'Custom encoding started for broadcast'),
]

def process_file(filepath):
    """Process a single file and apply replacements"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        
        # Apply all replacements
        for pattern, replacement in REPLACEMENTS:
            content = re.sub(pattern, replacement, content)
        
        # Only write if changes were made
        if content != original_content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"✅ Updated: {filepath}")
            return True
        else:
            print(f"⏭️  No changes: {filepath}")
            return False
            
    except Exception as e:
        print(f"❌ Error processing {filepath}: {e}")
        return False

def main():
    print("🚀 Starting Comercial → Broadcast rename process...\n")
    
    updated_count = 0
    for filepath in FILES_TO_PROCESS:
        if os.path.exists(filepath):
            if process_file(filepath):
                updated_count += 1
        else:
            print(f"⚠️  File not found: {filepath}")
    
    print(f"\n✨ Complete! Updated {updated_count} files.")

if __name__ == '__main__':
    main()
